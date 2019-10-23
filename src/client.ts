/**
 * @file RPC Client implementation.
 * @author Johan Nordberg <code@johan-nordberg.com>
 * @license
 * Copyright (c) 2017 Johan Nordberg. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *  1. Redistribution of source code must retain the above copyright notice, this
 *     list of conditions and the following disclaimer.
 *
 *  2. Redistribution in binary form must reproduce the above copyright notice,
 *     this list of conditions and the following disclaimer in the documentation
 *     and/or other materials provided with the distribution.
 *
 *  3. Neither the name of the copyright holder nor the names of its contributors
 *     may be used to endorse or promote products derived from this software without
 *     specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
 * OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
 * OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * You acknowledge that this software is not designed, licensed or intended for use
 * in the design, construction, operation or maintenance of any military facility.
 */

import {EventEmitter} from 'events'
import * as protobuf from 'protobufjs/minimal'
import {VError} from 'verror'
import * as WebSocket from 'ws'
import * as RPC from '../protocol/rpc'
import {waitForEvent} from './utils'

export let WS = WebSocket

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

/**
 * RPC Client options
 * ------------------
 * *Note* - The options inherited from `WebSocket.IClientOptions` are only
 * valid when running in node.js, they have no effect in the browser.
 */
export interface IClientOptions extends WebSocket.ClientOptions {
    /**
     * Event names to protobuf types, any event assigned a type will have
     * its payload decoded before the event is posted.
     */
    eventTypes?: {[name: string]: IProtobufType}
    /**
     * Retry backoff function, returns milliseconds. Default = {@link defaultBackoff}.
     */
    backoff?: (tries: number) => number
    /**
     * Whether to connect when {@link Client} instance is created. Default = `true`.
     */
    autoConnect?: boolean
    /**
     * How long in milliseconds before a message times out, set to `0` to disable.
     * Default = `5 * 1000`.
     */
    sendTimeout?: number
}

/**
 * RPC Client events
 * -----------------
 */
export interface IClientEvents {
    /**
     * Emitted when the connection closes/opens.
     */
    on(event: 'open' | 'close', listener: () => void): this
    /**
     * Emitted on error, throws if there is no listener.
     */
    on(event: 'error', listener: (error: Error) => void): this
    /**
     * RPC event sent by the server. If the event name is given a type
     * constructor in {@link IClientOptions.eventTypes} the data will
     * be decoded before the event is emitted.
     */
    on(event: 'event', listener: (name: string, data?: Uint8Array|{[k: string]: any}) => void): this
    on(event: 'event <name>', listener: (data?: Uint8Array|{[k: string]: any}) => void): this
}

/**
 * RPC Client
 * ----------
 * Can be used in both node.js and the browser. Also see {@link IClientOptions}.
 */
export class Client<T extends protobuf.rpc.Service> extends EventEmitter implements IClientEvents {

    /**
     * Client options, *readonly*.
     */
    public readonly options: IClientOptions

    /**
     * The protobuf service instance which holds all the rpc methods defined in your protocol.
     */
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

    /**
     * @param address The address to the {@link Server}, eg `ws://example.com:8042`.
     * @param service The protocol buffer service class to use, an instance of this
     *                will be available as {@link Client.service}.
     */
    constructor(address: string, service: {create(rpcImpl: protobuf.RPCImpl): T}, options: IClientOptions = {}) {
        super()

        this.address = address
        this.options = options
        this.service = service.create(this.rpcImpl)

        this.eventTypes = options.eventTypes || {}
        this.backoff = options.backoff || defaultBackoff
        this.writeMessage = process.title === 'browser' ? this.writeMessageBrowser : this.writeMessageNode
        this.sendTimeout = options.sendTimeout || 5 * 1000

        if (options.autoConnect === undefined || options.autoConnect === true) {
            this.connect()
        }
    }

    /**
     * Return `true` if the client is connected, otherwise `false`.
     */
    public isConnected(): boolean {
        return (this.socket !== undefined && this.socket.readyState === WS.OPEN)
    }

    /**
     * Connect to the server.
     */
    public async connect() {
        this.active = true
        if (this.socket) { return }
        if (process.title === 'browser') {
            this.socket = new WS(this.address)
            this.socket.addEventListener('message', this.messageHandler)
            this.socket.addEventListener('open', this.openHandler)
            this.socket.addEventListener('close', this.closeHandler)
            this.socket.addEventListener('error', this.errorHandler)
        } else {
            let didOpen = false
            this.socket = new WS(this.address, this.options)
            this.socket.onmessage = this.messageHandler
            this.socket.onopen = () => {
                didOpen = true
                this.openHandler()
            }
            this.socket.onclose = this.closeHandler
            this.socket.onerror = (error) => {
                if (!didOpen) { this.closeHandler() }
                this.errorHandler(error)
            }
        }
        (this.socket as any).binaryType = 'arraybuffer'
        await new Promise((resolve) => {
            const done = () => {
                this.removeListener('open', done)
                this.removeListener('close', done)
                resolve()
            }
            this.on('open', done)
            this.on('close', done)
        })
    }

    /**
     * Disconnect from the server.
     */
    public async disconnect() {
        this.active = false
        if (!this.socket) { return }
        if (this.socket.readyState !== WS.CLOSED) {
            this.socket.close()
            await waitForEvent(this, 'close')
        }
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

    private errorHandler = (error: any) => {
        this.emit('error', error)
    }

    private openHandler = () => {
        this.numRetries = 0
        this.emit('open')
        this.flushMessageBuffer().catch(this.errorHandler)
    }

    private rpcImpl: protobuf.RPCImpl = (method, requestData, callback) => {
        const seq = this.nextSeq
        this.nextSeq = (this.nextSeq + 1) & 0xffff

        const message: RPC.IMessage = {
            request: {
                method: method.name,
                payload: requestData,
                seq,
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

    private rpcCallback = (seq: number, error: Error|null, response?: (Uint8Array|null)) => {
        if (!this.messageBuffer[seq]) {
            this.errorHandler(new VError({cause: error}, `Got response for unknown seqNo: ${ seq }`))
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
            this.errorHandler(error)
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
                    this.errorHandler(error)
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

/**
 * Default backoff function.
 * ```min(tries*10^2, 10 seconds)```
 */
const defaultBackoff = (tries: number): number => {
    return Math.min(Math.pow(tries * 10, 2), 10 * 1000)
}
