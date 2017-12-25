
import 'mocha'

import * as protobuf from 'protobufjs'
import * as assert from 'assert'

import * as path from 'path'
import * as crypto from 'crypto'
import {Server, Client} from './../src'
import * as wsrpc_client from './../src/client'
import {waitForEvent} from './../src/utils'
import {TestService, TextMessage} from './../protocol/test'
import * as rpcproto from './../protocol/rpc'
import * as WebSocket from 'ws'

const testPort = 1234
const testAddr = `ws://localhost:${ testPort }`
const testProtoPath = path.join(__dirname, './../protocol/test.proto')
const testProto = protobuf.loadSync(testProtoPath)

const serverService = testProto.lookupService('TestService')
const serverOpts = {
    port: testPort,
    pingInterval: 0.05,
}

describe('rpc', () => {

    let planError = false

    let server = new Server(serverService, serverOpts)

    server.implement('echo', async (request: TextMessage) => {
        if (request.text === 'throw-string') {
            throw 'You should always trow an error object'
        }
        if (request.text === 'throw') {
            throw new Error('Since you asked for it')
        }
        return {text: request.text}
    })

    server.implement(serverService.methods['Upper'], (request: TextMessage) => {
        return new Promise((resolve, reject) => {
            const text = request.text.toUpperCase()
            setTimeout(() => {
                resolve({text})
            }, 50)
        })
    })

    server.on('error', (error: Error) => {
        if (!planError) {
            console.warn('unplanned server error', error.message)
        }
    })

    const client = new Client(testAddr, TestService, {
        sendTimeout: 100,
        eventTypes: {
            'text': TextMessage
        }
    })

    client.on('error', (error: Error) => {
        if (!planError) {
            console.warn('unplanned client error', error.message)
        }
    })
    after(async () => await client.disconnect())

    it('should throw when implementing invalid method', function() {
        assert.throws(() => {
            server.implement('kek', async () => { return {}})
        })
        assert.throws(() => {
            const orphanMethod = new protobuf.Method('Keke', 'foo', 'bar', 'baz')
            server.implement(orphanMethod, async () => { return {}})
        })
    })

    it('should run echo rpc method', async function() {
        const response = await client.service.echo({text: 'hello world'})
        assert.equal(response.text, 'hello world')
    })

    it('should run upper rpc method', async function() {
        this.slow(150)
        const response = await client.service.upper({text: 'hello world'})
        assert.equal(response.text, 'HELLO WORLD')
    })

    it('should handle thrown errors in implementation handler', async function() {
        planError = true
        try {
            await client.service.echo({text: 'throw'})
            assert(false, 'should not be reached')
        } catch (error) {
            assert.equal(error.name, 'RPCError')
            assert.equal(error.message, 'Since you asked for it')
        }
    })

    it('should handle thrown strings in implementation handler', async function() {
        try {
            await client.service.echo({text: 'throw-string'})
            assert(false, 'should not be reached')
        } catch (error) {
            assert.equal(error.name, 'RPCError')
            assert.equal(error.message, 'You should always trow an error object')
        }
    })

    it('should handle unimplemented methods', async function() {
        try {
            await client.service.notImplemented({})
            assert(false, 'should throw')
        } catch (error) {
            assert.equal(error.name, 'RPCError')
            assert.equal(error.message, 'Not implemented')
        }
    })

    it('should handle bogus request message', function(done) {
        const c = client as any
        const msg = rpcproto.Message.encode({
            type: rpcproto.Message.Type.REQUEST,
            request: {
                seq: 0,
                method: crypto.pseudoRandomBytes(1e4).toString('utf8'),
            }
        }).finish()
        c.socket.send(msg)
        server.once('error', (error: any) => {
            assert.equal(error.message, 'connection error: Invalid method')
            done()
        })
    })

    it('should handle bogus message', function(done) {
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
            assert.equal(error.message, 'connection error: could not decode message: Invalid message type')
            done()
        })
    })


    it('should handle garbled data from client', function(done) {
        planError = true
        const c = client as any
        c.socket.send(crypto.pseudoRandomBytes(512))
        server.once('error', (error: any) => {
            assert.equal(error.jse_cause.name, 'RequestError')
            assert.equal(error.jse_cause.jse_shortmsg, 'could not decode message')
            done()
        })
    })

    it('should handle garbled data from server', function(done) {
        assert.equal(server.connections.length, 1)
        let conn = server.connections[0] as any
        conn.socket.send(crypto.pseudoRandomBytes(1024))
        client.once('error', (error: any) => {
            assert.equal(error.name, 'MessageError')
            assert.equal(error.jse_shortmsg, 'got invalid message')
            done()
        })
    })

    it('should emit event', function(done) {
        planError = false
        assert.equal(server.connections.length, 1)
        const data = crypto.pseudoRandomBytes(42)
        server.connections[0].send('marvin', data)
        client.once('event', (name: string, payload?: Uint8Array) => {
            assert.equal(name, 'marvin')
            assert.deepEqual(payload, data)
            done()
        })
    })

    it('should emit typed event', function(done) {
        const text = 'I like les turlos'
        server.broadcast('text', TextMessage.encode({text}).finish())
        client.once('event', (name: string, payload: TextMessage) => {
            assert.equal(name, 'text')
            assert.equal(payload.text, text)
            done()
        })
    })

    it('should handle garbled event data', function(done) {
        planError = true
        server.broadcast('text', crypto.pseudoRandomBytes(42))
        client.once('error', (error: any) => {
            assert.equal(error.name, 'EventError')
            assert.equal(error.jse_shortmsg, 'could not decode event payload')
            done()
        })
    })

    it('should timeout messages', async function() {
        planError = false
        this.slow(300)
        const response = client.service.echo({text: 'foo'})
        await client.disconnect()
        try {
            await response
            assert(false, 'should throw')
        } catch (error) {
            assert.equal(error.name, 'TimeoutError')
        }
    })

    it('should reconnect', async function() {
        await client.connect()
        const response = await client.service.echo({text: 'baz'})
        assert(response.text, 'baz')
    })

    it('should handle server disconnection', async function() {
        this.slow(300)
        const c = client as any
        c.sendTimeout = 1000

        assert.equal(server.connections.length, 1)
        server.connections[0].close()
        await waitForEvent(client, 'close')

        const buzz = client.service.echo({text: 'fizz'})
        const fizz = client.service.echo({text: 'buzz'})
        const response = await Promise.all([buzz, fizz])
        assert.deepEqual(response.map((msg) => msg.text), ['fizz', 'buzz'])
    })

    it('should retry', async function() {
        this.slow(300)
        server.close()
        await waitForEvent(client, 'close')
        planError = true
        // force a connection failure to simulate server being down for a bit
        await client.connect()
        planError = false
        server = new Server(serverService, serverOpts)
        await waitForEvent(client, 'open')
    })

    it('should handle failed writes', async function() {
        (<any> client).socket.send = () => { throw new Error('boom') }
        try {
            await client.service.echo({text: 'boom'})
            assert(false, 'should not be reached')
        } catch (error) {
            assert.equal(error.message, 'boom')
        }
    })

    it('should close server', async function() {
        server.close()
        await waitForEvent(client, 'close')
    })

})

describe('rpc browser client', function() {
    // simulated browser test using the ws module

    let server: Server
    let client: Client<TestService>

    before(async function() {
        (<any>wsrpc_client).WS = WebSocket
        process.title = 'browser'
        server = new Server(serverService, serverOpts)
        server.implement('echo', async (request: TextMessage) => {
            return {text: request.text}
        })
        client = new Client(testAddr, TestService)
    })

    after(async function() {
        await client.disconnect()
        server.close()
    })

    it('should work', async function() {
        const response = await client.service.echo({text: 'foo'})
        assert.equal(response.text, 'foo')
    })
})
