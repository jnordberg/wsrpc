/**
 * # wsrpc
 * ## server implementation
 * author: Johan Nordberg <code@johan-nordberg.com>
 */

import {EventEmitter} from 'events'
import * as protobuf from 'protobufjs/minimal'
import {VError} from 'verror'
import * as WebSocket from 'ws'
import * as RPC from '../protocol/rpc'
import {waitForEvent} from './utils'

export interface IProtobufType {
    encode(message: any, writer?: protobuf.Writer): protobuf.Writer
    decode(reader: (protobuf.Reader|Uint8Array), length?: number): any
}

interface IRPCMessage {
    callback: protobuf.RPCImplCallback,
    message?: RPC.IMessage,
    seq: number,
    timer?: NodeJS.Timer,
}

export interface IClientOptions extends WebSocket.IClientOptions {
    /**
     * Event names to protobuf types, any event assigned a type will have
     * its payload decoded before the event is posted.
     */
    eventTypes?: {[name: string]: IProtobufType}
    /**
     * Retry backoff function, returns milliseconds, default = tries*10**2.
     */
    backoff?: (tries: number) => number
    /**
     * Automatically connect, default = true.
     */
    autoConnect?: boolean
    /**
     * How long in milliseconds before a message times out, default = 5 * 1000.
     * Set to 0 to disable.
     */
    sendTimeout?: number
}

export interface IClientEvents {
    on(event: 'open' | 'close', listener: () => void): this
    on(event: 'error', listener: (error: Error) => void): this
    on(event: 'event', listener: (name: string, data?: Uint8Array) => void): this
}

export class Client<T extends protobuf.rpc.Service> extends EventEmitter implements IClientEvents {

    public readonly options: IClientOptions
    public readonly service: T

    private active: boolean = false
    private address: string
    private backoff: (tries: number) => number
    private eventTypes: {[name: string]: IProtobufType}
    private messageBuffer: {[seq: number]: IRPCMessage} = {}
    private nextSeq: number = 0
    private numRetries: number = 0
    private sendTimeout: number
    private socket?: WebSocket
    private writeMessage: (message: RPC.IMessage) => Promise<void>

    constructor(address: string, service: {new(rpcImpl: protobuf.RPCImpl): T}, options: IClientOptions = {}) {
        super()

        this.address = address
        this.options = options
        this.service = new service(this.rpcImpl)
        this.eventTypes = options.eventTypes || {}
        this.backoff = options.backoff || defaultBackoff
        this.writeMessage = process.title === 'browser' ? this.writeMessageBrowser : this.writeMessageNode
        this.sendTimeout = options.sendTimeout || 5 * 1000

        if (options.autoConnect === undefined || options.autoConnect === true) {
            this.connect()
        }
    }

    public isConnected(): boolean {
        return (this.socket !== undefined && this.socket.readyState === WebSocket.OPEN)
    }

    public async disconnect() {
        this.active = false
        if (!this.socket) { return }
        if (this.socket.readyState !== WebSocket.CLOSED) {
            this.socket.close()
            await waitForEvent(this, 'close')
        }
    }

    public async connect() {
        this.active = true
        if (this.socket) { return }
        if (process.title === 'browser') {
            this.socket = new WebSocket(this.address)
        } else {
            this.socket = new WebSocket(this.address, this.options)
        }

        // TODO: remove cast when merged - https://github.com/DefinitelyTyped/DefinitelyTyped/pull/16181
        const socket = this.socket as any
        socket.binaryType = 'arraybuffer'

        this.socket.addEventListener('message', this.messageHandler)
        this.socket.addEventListener('open', this.openHandler)
        this.socket.addEventListener('close', this.closeHandler)
        this.socket.addEventListener('error', (error) => { this.emit('error', error) })

        await Promise.race([waitForEvent(this, 'open'), waitForEvent(this, 'close')])
    }

    private retryHandler = () => {
        if (this.active) {
            this.connect()
        }
    }

    private closeHandler = () => {
        this.emit('close')
        this.socket = undefined
        if (this.active) {
            setTimeout(this.retryHandler, this.backoff(++this.numRetries))
        }
    }

    private openHandler = () => {
        this.numRetries = 0
        this.emit('open')
        this.flushMessageBuffer().catch((error: Error) => {
            this.emit('error', error)
        })
    }

    private rpcImpl: protobuf.RPCImpl = (method, requestData, callback) => {
        const seq = this.nextSeq
        this.nextSeq = (this.nextSeq + 1) & 0xffff

        const message: RPC.IMessage = {
            request: {
                method: method.name,
                seq,
                payload: requestData,
            },
            type: RPC.Message.Type.REQUEST,
        }

        let timer: NodeJS.Timer|undefined
        if (this.sendTimeout > 0) {
            timer = setTimeout(() => {
                const error = new VError({name: 'TimeoutError'}, `Timed out after ${ this.sendTimeout }ms`)
                this.rpcCallback(seq, error)
            }, this.sendTimeout)
        }
        this.messageBuffer[seq] = {seq, callback, timer}

        if (this.isConnected()) {
            this.writeMessage(message).catch((error: Error) => {
                this.rpcCallback(seq, error)
            })
        } else {
            this.messageBuffer[seq].message = message
        }
    }

    private rpcCallback = (seq: number, error: Error|null, response?: Uint8Array) => {
        if (!this.messageBuffer[seq]) {
            this.emit('error', new VError({cause: error}, `Got response for unknown seqNo: ${ seq }`))
            return
        }
        const {callback, timer} = this.messageBuffer[seq]
        if (timer) { clearTimeout(timer) }
        delete this.messageBuffer[seq]
        callback(error, response)
    }

    private writeMessageNode = async (message: RPC.IMessage) => {
        await new Promise((resolve, reject) => {
            if (!this.socket) { throw new Error('No socket') }
            const data = RPC.Message.encode(message).finish()
            this.socket.send(data, (error: Error) => {
                if (error) { reject(error) } else { resolve() }
            })
        })
    }

    private writeMessageBrowser = async (message: RPC.IMessage) => {
        if (!this.socket) { throw new Error('No socket') }
        // TODO: JSON fallback for browsers not supporting binary sockets
        const data = RPC.Message.encode(message).finish()
        this.socket.send(data)
    }

    private async flushMessageBuffer() {
        const messages: IRPCMessage[] = []
        for (const seq in this.messageBuffer) {
            if (this.messageBuffer[seq].message) {
                messages.push(this.messageBuffer[seq])
            }
        }
        messages.sort((a, b) => a.seq - b.seq)
        while (messages.length > 0) {
            const message = messages.shift() as IRPCMessage
            try {
                await this.writeMessage(message.message as RPC.IMessage)
                message.message = undefined
            } catch (error) {
                this.rpcCallback(message.seq, error)
            }
        }
    }

    private messageHandler = (event: {data: any, type: string, target: WebSocket}) => {
        try {
            let data = event.data
            if (event.data instanceof ArrayBuffer) {
                data = new Uint8Array(event.data)
            }
            const message = RPC.Message.decode(data)
            switch (message.type) {
                case RPC.Message.Type.RESPONSE:
                    const response = message.response
                    if (!response) { throw new Error('Response data missing') }
                    this.responseHandler(response)
                    break
                case RPC.Message.Type.EVENT:
                    const eventData = message.event
                    if (!eventData) { throw new Error('Event data missing') }
                    this.eventHandler(eventData)
                    break
            }
        } catch (cause) {
            const error = new VError({cause, name: 'MessageError'}, 'got invalid message')
            this.emit('error', error)
        }
    }

    private async responseHandler(response: RPC.IResponse) {
        if (!response.ok) {
            this.rpcCallback(response.seq, new VError({name: 'RPCError'}, response.error || 'Unknown error'))
        } else {
            this.rpcCallback(response.seq, null, response.payload)
        }
    }

    private eventHandler(event: RPC.IEvent) {
        const type = this.eventTypes[event.name]
        let payload: protobuf.Message<{}> | Uint8Array | undefined
        if (event.payload && event.payload.length > 0) {
            if (type) {
                try {
                    payload = type.decode(event.payload)
                } catch (cause) {
                    const error = new VError({cause, name: 'EventError'}, 'could not decode event payload')
                    this.emit('error', error)
                    return
                }
            } else {
                payload = event.payload
            }
        }
        this.emit('event', event.name, payload)
        this.emit(`event ${ event.name }`, payload)
    }

}

const defaultBackoff = (tries: number): number => {
    return Math.min(Math.pow(tries * 10, 2), 60 * 1000)
}
