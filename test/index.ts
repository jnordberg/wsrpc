import 'mocha'

import * as protobuf from 'protobufjs'
import * as assert from 'assert'

import * as path from 'path'
import * as crypto from 'crypto'
import { Server, Client } from '../src'
import * as wsrpc_client from '../src/Client'
import { waitForEvent } from '../src/utils'
import { test1 as test1Proto }  from '../protocol/test-1'
import { test2, test2 as test2Proto } from '../protocol/test-2'
import { collision as collisionProto }  from '../protocol/test-collision'
import * as rpcproto from '../protocol/rpc'
import * as WebSocket from 'ws'

const testPort = 1234
const testAddr = `ws://localhost:${testPort}`
const testProto = protobuf.loadSync([
    path.join(__dirname, './../protocol/test-1.proto'),
    path.join(__dirname, './../protocol/test-2.proto')
])
const testProtoCollision = protobuf.loadSync(path.join(__dirname, './../protocol/test-collision.proto'))

const testService1: protobuf.Service = testProto.lookupService('TestService1')
const testService2: protobuf.Service = testProto.lookupService('TestService2')
const collisionTestService: protobuf.Service = testProtoCollision.lookupService('CollisionTestService')

const testServices = [
    testService1,
    testService2,
    collisionTestService
]

const serverOpts = {
    port: testPort,
    pingInterval: 0.05,
}

describe('rpc with a single service', () => {

    let planError = false

    let server: Server
    let client: Client

    before(async () => {
        server = new Server(testService1, serverOpts)

        server.implement('echo', async (request: test1Proto.TextMessage) => {
            if (request.text === 'throw-string') {
                throw 'You should always trow an error object'
            }
            if (request.text === 'throw') {
                throw new Error('Since you asked for it')
            }
            return { text: request.text }
        })

        server.implement(testService1.methods['Upper'], (request: test1Proto.TextMessage) => {
            return new Promise((resolve, reject) => {
                const text = request.text.toUpperCase()
                setTimeout(() => {
                    resolve({ text })
                }, 50)
            })
        })

        server.on('error', (error: Error) => {
            if (!planError) {
                console.warn('unplanned server error', error.message)
            }
        })

        client = new Client(testAddr, testService1, {
            sendTimeout: 100,
            eventTypes: {
                'text': test1Proto.TextMessage
            }
        })

        client.on('error', (error: Error) => {
            if (!planError) {
                console.warn('unplanned client error', error.message)
            }
        })
    })

    after(async () => {
        await client.disconnect()
    })

    it('should throw when implementing invalid method', function () {
        assert.throws(() => {
            server.implement('TestService', 'kek', async () => {
                return {}
            })
        })
        assert.throws(() => {
            const orphanMethod = new protobuf.Method('Keke', 'foo', 'bar', 'baz')
            server.implement(orphanMethod, async () => {
                return {}
            })
        })
    })

    it('should run echo rpc method', async function () {
        // @ts-ignore
        const response = await client.service.echo({ text: 'hello world' })
        assert.strictEqual(response.text, 'hello world')
    })

    it('should run upper rpc method', async function () {
        this.slow(150)
        // @ts-ignore
        const response = await client.service.upper({ text: 'hello world' })
        assert.strictEqual(response.text, 'HELLO WORLD')
    })

    it('should handle thrown errors in implementation handler', async function () {
        planError = true
        try {
            // @ts-ignore
            await client.service.echo({ text: 'throw' })
            assert(false, 'should not be reached')
        } catch (error) {
            assert.strictEqual(error.name, 'RPCError')
            assert.strictEqual(error.message, 'Since you asked for it')
        }
    })

    it('should handle thrown strings in implementation handler', async function () {
        try {
            // @ts-ignore
            await client.service.echo({ text: 'throw-string' })
            assert(false, 'should not be reached')
        } catch (error) {
            assert.strictEqual(error.name, 'RPCError')
            assert.strictEqual(error.message, 'You should always trow an error object')
        }
    })

    it('should handle unimplemented methods', async function () {
        try {
            // @ts-ignore
            await client.service.notImplemented({})
            assert(false, 'should throw')
        } catch (error) {
            assert.strictEqual(error.name, 'RPCError')
            assert.strictEqual(error.message, 'Not implemented')
        }
    })

    it('should handle bogus service request message', function (done) {
        const c = client as any
        const msg = rpcproto.Message.encode({
            type: rpcproto.Message.Type.REQUEST,
            request: {
                seq: 0,
                method: 'echo',
                service: crypto.pseudoRandomBytes(1e4).toString('utf8'),
            },
        }).finish()
        c.socket.send(msg)
        server.once('error', (error: any) => {
            assert.strictEqual(error.message, 'connection error: Invalid service')
            done()
        })
    })

    it('should handle bogus method request', function (done) {
        const c = client as any
        const msg = rpcproto.Message.encode({
            type: rpcproto.Message.Type.REQUEST,
            request: {
                seq: 0,
                method: crypto.pseudoRandomBytes(1e4).toString('utf8'),
                service: 'TestService1',
            },
        }).finish()
        c.socket.send(msg)
        server.once('error', (error: any) => {
            assert.strictEqual(error.message, 'connection error: Invalid method')
            done()
        })
    })

    it('should handle bogus message', function (done) {
        const c = client as any
        const msg = rpcproto.Message.encode({
            type: rpcproto.Message.Type.EVENT,
            response: {
                seq: -100,
                ok: false,
                payload: crypto.pseudoRandomBytes(1e6),
            }
        }).finish()
        c.socket.send(msg)
        server.once('error', (error: any) => {
            assert.strictEqual(error.message, 'connection error: could not decode message: Invalid message type')
            done()
        })
    })


    it('should handle garbled data from client', function (done) {
        planError = true
        const c = client as any
        c.socket.send(crypto.pseudoRandomBytes(512))
        server.once('error', (error: any) => {
            assert.strictEqual(error.jse_cause.name, 'RequestError')
            assert.strictEqual(error.jse_cause.jse_shortmsg, 'could not decode message')
            done()
        })
    })

    it('should handle garbled data from server', function (done) {
        assert.strictEqual(server.connections.length, 1)
        let conn = server.connections[0] as any
        conn.socket.send(crypto.pseudoRandomBytes(1024))
        client.once('error', (error: any) => {
            assert.strictEqual(error.name, 'MessageError')
            assert.strictEqual(error.jse_shortmsg, 'got invalid message')
            done()
        })
    })

    it('should emit event', function (done) {
        planError = false
        assert.strictEqual(server.connections.length, 1)
        const data = crypto.pseudoRandomBytes(42)
        server.connections[0].send('marvin', data)
        client.once('event', (name: string, payload?: Uint8Array) => {
            assert.strictEqual(name, 'marvin')
            assert.deepEqual(payload, data)
            done()
        })
    })

    it('should emit typed event', function (done) {
        const text = 'I like les turlos'
        server.broadcast('text', test1Proto.TextMessage.encode({ text }).finish())
        client.once('event', (name: string, payload: test1Proto.TextMessage) => {
            assert.strictEqual(name, 'text')
            assert.strictEqual(payload.text, text)
            done()
        })
    })

    it('should handle garbled event data', function (done) {
        planError = true
        server.broadcast('text', crypto.pseudoRandomBytes(42))
        client.once('error', (error: any) => {
            assert.strictEqual(error.name, 'EventError')
            assert.strictEqual(error.jse_shortmsg, 'could not decode event payload')
            done()
        })
    })

    it('should timeout messages', async function () {
        planError = false
        this.slow(300)
        // @ts-ignore
        const response = client.service.echo({ text: 'foo' })
        await client.disconnect()
        try {
            await response
            assert(false, 'should throw')
        } catch (error) {
            assert.strictEqual(error.name, 'TimeoutError')
        }
    })

    it('should reconnect', async function () {
        await client.connect()
        // @ts-ignore
        const response = await client.service.echo({ text: 'baz' })
        assert(response.text, 'baz')
    })

    it('should handle server disconnection', async function () {
        this.slow(300)
        const c = client as any
        c.sendTimeout = 1000

        assert.strictEqual(server.connections.length, 1)
        server.connections[0].close()
        await waitForEvent(client, 'close')

        // @ts-ignore
        const buzz = client.service.echo({ text: 'fizz' })
        // @ts-ignore
        const fizz = client.service.echo({ text: 'buzz' })
        const response = await Promise.all([buzz, fizz])
        assert.deepEqual(response.map((msg) => msg.text), ['fizz', 'buzz'])
    })

    it('should retry', async function () {
        this.slow(300)
        server.close()
        await waitForEvent(client, 'close')
        planError = true
        // force a connection failure to simulate server being down for a bit
        await client.connect()
        planError = false
        server = new Server([testService1], serverOpts)
        await waitForEvent(client, 'open')
    })

    it('should handle failed writes', async function () {
        (<any>client).socket.send = () => {
            throw new Error('boom')
        }
        try {
            // @ts-ignore
            await client.service.echo({ text: 'boom' })
            assert(false, 'should not be reached')
        } catch (error) {
            assert.strictEqual(error.message, 'boom')
        }
    })

    it('should close server', async function () {
        server.close()
        await waitForEvent(client, 'close')
    })
})

describe('rpc with multiple services', () => {

    let planError = false

    let server: Server
    let client: Client

    before(async () => {
        server = new Server(testServices, serverOpts)

        server.implement('testService1', 'echo', async (request: test1Proto.TextMessage) => {
            if (request.text === 'throw-string') {
                throw 'You should always trow an error object'
            }
            if (request.text === 'throw') {
                throw new Error('Since you asked for it')
            }
            return { text: request.text }
        })

        server.implement(testService1, 'Upper', (request: test1Proto.TextMessage) => {
            return new Promise((resolve, reject) => {
                const text = request.text.toUpperCase()
                setTimeout(() => {
                    resolve({ text })
                }, 50)
            })
        })

        server.implement(testService2.methods.Echo, async (request: test2Proto.TextMessage) => {
            return { text: request.text + ' made by test2' }
        })

        server.implement(collisionTestService.methods.Echo, async (request: collisionProto.TextMessage) => {
            return { text: request.text, madeBy: 'collisionTestService' }
        })

        server.on('error', (error: Error) => {
            if (!planError) {
                console.warn('unplanned server error', error.message)
            }
        })

        client = new Client(testAddr, testServices, {
            sendTimeout: 100,
            eventTypes: {
                'text': test1Proto.TextMessage
            }
        })

        client.on('error', (error: Error) => {
            if (!planError) {
                console.warn('unplanned client error', error.message)
            }
        })
    })

    after(async () => {
        await client.disconnect()
    })

    it('should run TestService1.echo rpc method', async function () {
        // @ts-ignore
        const response = await client.services.TestService1.echo({ text: 'hello world' })
        assert.strictEqual(response.text, 'hello world')
    })

    it('should run TestService1.upper rpc method', async function () {
        this.slow(150)
        // @ts-ignore
        const response = await client.services.TestService1.upper({ text: 'hello world' })
        assert.strictEqual(response.text, 'HELLO WORLD')
    })

    it('should run TestService2.echo rpc method', async function () {
        // @ts-ignore
        const response = await client.services.TestService2.echo({ text: 'hello world' })
        assert.strictEqual(response.text, 'hello world made by test2')
    })

    it('should run CollisionTestService.echo rpc method', async function () {
        // @ts-ignore
        const response = await client.services.CollisionTestService.echo({ text: 'hello world' })
        assert.strictEqual(response.text, 'hello world')
        assert.strictEqual(response.madeBy, 'collisionTestService')
    })

    it('should return undefined when trying to access default service', async function () {
        assert.strictEqual(typeof client.service, 'undefined')
    })

    it('should throw when trying to use default service', async function () {
        try {
            // @ts-ignore
            await client.service.echo({ text: 'hello world' })
            assert(false, 'client should throw')
        } catch (error) {
            assert.strictEqual(error.name, 'TypeError')
            assert.strictEqual(error.message, 'Cannot read property \'echo\' of undefined')
        }
    })

    it('should close server', async function () {
        server.close()
        await waitForEvent(client, 'close')
    })
})

describe('rpc browser client', () => {
    // simulated browser test using the ws module

    let server: Server
    let client: Client

    before(async function () {
        (<any>wsrpc_client).WS = WebSocket
        process.title = 'browser'
        server = new Server([testService1], serverOpts)
        server.implement(testService1, testService1.methods.Echo, async (request: test1Proto.TextMessage) => {
            return { text: request.text }
        })
        client = new Client(testAddr, [testService1])
    })

    after(async function () {
        await client.disconnect()
        server.close()
    })

    it('should work', async function () {
        // @ts-ignore
        const response = await client.service.echo({ text: 'foo' })
        assert.strictEqual(response.text, 'foo')
    })
})
