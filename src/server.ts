/**
 * @file RPC Server implementation.
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
import * as RPC from './../protocol/rpc'
import {getFullName} from './utils'

/**
 * RPC Server options
 * ------------------
 * Server options, extends the WebSocket server options.
 * Note that `WebSocket.IServerOptions.perMessageDeflate` defaults
 * to `false` if omitted.
 */
export interface IServerOptions extends WebSocket.ServerOptions {
    /**
     * How often to send a ping frame, in seconds. Set to 0 to disable. Default = 10.
     */
    pingInterval?: number
}

export interface IServerEvents {
    on(event: 'connection', listener: (connection: Connection) => void): void
    on(event: 'error', listener: (error: Error) => void): void
}

export type Message = protobuf.Message<{}>|{[k: string]: any}
export type Handler = (request: Message, connection: Connection) => Promise<Message>

/**
 * RPC Server
 * ----------
 */
export class Server extends EventEmitter implements IServerEvents {

    /**
     * List of clients currently connected to server.
     */
    public readonly connections: Connection[] = []

    /**
     * Implemented RPC method handlers, read-only. {@see Service.implement}
     */
    public readonly handlers: {[name: string]: Handler} = {}

    /**
     * Server options, read-only.
     */
    public readonly options: IServerOptions

    /**
     * The protobuf Root instance, internal.
     */
    public readonly root: protobuf.Root

    /**
     * The underlying uWebSocket server, internal.
     */
    public readonly server: WebSocket.Server

    private connectionCounter: number = 0
    private pingInterval: number

    /**
     * @param root The protocol buffer root which contains the services to serve.
     * @param options Options, see {@link IServerOptions}.
     */
    constructor(root: protobuf.Root, options: IServerOptions = {}) {
        super()

        this.root = root
        this.options = options

        options.clientTracking = false
        if (options.perMessageDeflate === undefined) {
            options.perMessageDeflate = false
        }

        this.pingInterval = options.pingInterval || 10

        this.server = new WebSocket.Server(options)
        this.server.on('listening', () => { this.emit('listening') })
        this.server.on('error', (cause: any) => {
            this.emit('error', new VError({name: 'WebSocketError', cause}, 'server error'))
        })
        this.server.on('connection', this.connectionHandler)
        this.server.on('headers', (headers) => { this.emit('headers', headers) })
    }

    /**
     * Implement a RPC method defined in the protobuf service.
     */
    public implement(method: protobuf.Method|string, handler: Handler) {
        if (typeof method !== 'string') {
            method = getFullName(method)
        }

        const result: any = this.root.lookup(method)
        if (!result || !(result instanceof protobuf.Method)) {
            throw new Error('Invalid method')
        }
        method = result
        const fullMethodName = getFullName(method)

        method.resolve()
        this.handlers[fullMethodName] = handler
    }

    /**
     * Send event to all connected clients. {@see Connection.send}
     */
    public async broadcast(name: string, payload?: Uint8Array) {
        const promises = this.connections.map((connection) => {
            return connection.send(name, payload)
        })
        await Promise.all(promises)
    }

    /**
     * Stop listening and close all connections.
     */
    public close() {
        this.connections.forEach((connection) => {
            connection.close()
        })
        this.server.close()
    }

    private connectionHandler = (socket: WebSocket) => {
        const connection = new Connection(socket, this, ++this.connectionCounter)
        this.connections.push(connection)

        connection.on('error', (cause: Error) => {
            const error: Error = new VError({name: 'ConnectionError', cause}, 'connection error')
            this.emit('error', error)
        })

        let pingTimer: NodeJS.Timer
        if (this.pingInterval !== 0) {
            pingTimer = setInterval(() => { socket.ping() }, this.pingInterval * 1000)
        }

        connection.once('close', () => {
            clearInterval(pingTimer)
            const idx = this.connections.indexOf(connection)
            if (idx !== -1) {
                this.connections.splice(idx, 1)
            }
        })

        this.emit('connection', connection)
    }
}

/**
 * Class representing a connection to the server, i.e. client.
 */
export class Connection extends EventEmitter {

    /**
     * Unique identifier for this connection.
     */
    public readonly id: number

    /**
     * The underlying WebSocket instance.
     */
    public readonly socket: WebSocket

    private server: Server

    constructor(socket: WebSocket, server: Server, id: number) {
        super()
        this.socket = socket
        this.server = server
        this.id = id
        socket.on('message', this.messageHandler)
        socket.on('close', () => { this.emit('close') })
        socket.on('error', (error) => { this.emit('error', error) })
    }

    /**
     * Send event to client with optional payload.
     */
    public send(name: string, payload?: Uint8Array): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const event: RPC.IEvent = {name}
            if (payload) {
                event.payload = payload
            }
            const message = RPC.Message.encode({
                event, type: RPC.Message.Type.EVENT,
            }).finish()
            this.socket.send(message, (error) => {
                if (error) { reject(error) } else { resolve() }
            })
        })
    }

    /**
     * Close the connection to the client.
     */
    public close() {
        this.socket.close()
    }

    private async requestHandler(request: RPC.Request): Promise<RPC.Response> {
        const fullMethodName = request.method

        const result = this.server.root.lookup(fullMethodName)
        if (!result || !(result instanceof protobuf.Method)) {
            throw new Error('Invalid method')
        }
        const method: protobuf.Method = result

        const impl = this.server.handlers[fullMethodName]
        if (!impl) {
            throw new Error('Not implemented')
        }

        if (!method.resolvedRequestType || !method.resolvedResponseType) {
            throw new Error('Unable to resolve method types')
        }

        const requestData = method.resolvedRequestType.decode(request.payload)
        let responseData: Message
        try {
            responseData = await impl(requestData, this)
        } catch (error) {
            if (!(error instanceof Error)) {
                error = new Error(String(error))
            }
            throw error
        }

        const response = new RPC.Response({seq: request.seq, ok: true})
        response.payload = method.resolvedResponseType.encode(responseData).finish()

        return response
    }

    private messageHandler = (data: any) => {
        let request: RPC.Request
        try {
            const message = RPC.Message.decode(new Uint8Array(data))
            if (message.type !== RPC.Message.Type.REQUEST) {
                throw new Error('Invalid message type')
            }
            if (!message.request) {
                throw new Error('Message request missing')
            }
            request = new RPC.Request(message.request)
        } catch (cause) {
            const error = new VError({name: 'RequestError', cause}, 'could not decode message')
            this.emit('error', error)
            return
        }
        this.requestHandler(request).then((response) => {
            const message = RPC.Message.encode({type: RPC.Message.Type.RESPONSE, response}).finish()
            return new Promise<void>((resolve, reject) => {
                this.socket.send(message, (error) => {
                    if (error) { reject(error) } else { resolve ()}
                })
            })
        }).catch((error: Error) => {
            const message = RPC.Message.encode({
                response: {
                    error: error.message,
                    ok: false,
                    seq: request.seq,
                },
                type: RPC.Message.Type.RESPONSE,
            }).finish()
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(message)
            }
            setImmediate(() => {
                // this avoids the promise swallowing the error thrown
                // by emit 'error' when no listeners are present
                this.emit('error', error)
            })
        })
    }
}
