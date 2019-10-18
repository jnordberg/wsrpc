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

import { EventEmitter } from 'events'
import * as protobuf from 'protobufjs/minimal'
import * as WebSocket from 'uws'
import { VError } from 'verror'

import { IServerEvents } from './interface/IServerEvents'
import { IServerOptions } from './interface/IServerOptions'

import { Handler } from './type/Handler'

import { Connection } from './Connection'

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
    public readonly handlers: {[serviceName: string]: {[methodName: string]: Handler}} = {}

    /**
     * Server options, read-only.
     */
    public readonly options: IServerOptions

    /**
     * Protobuf service instances, internal.
     */
    public readonly services: {[name: string]: protobuf.Service} = {}

    /**
     * Default service accessor when using a single service only. (backwards compatibility)
     */
    public readonly service?: protobuf.Service

    /**
     * The underlying uWebSocket server, internal.
     */
    public readonly server: WebSocket.Server

    private connectionCounter: number = 0
    private pingInterval: number

    /**
     * @param services The protocol buffer services to serve. {@link Server.services}
     * @param options Options, see {@link IServerOptions}.
     */
    constructor(services: protobuf.Service[] | protobuf.Service, options: IServerOptions = {}) {
        super()

        if (!Array.isArray(services)) {
            // Single service usage
            services = [services]
        }

        services.forEach((service) => {
            this.services[service.name] = service
            this.handlers[service.name] = {}
        })

        if (services.length === 1) {
            // Set the default service (backwards compatibility)
            this.service = this.services[services[0].name]
        }

        this.options = options

        options.clientTracking = false
        if (options.perMessageDeflate === undefined) {
            options.perMessageDeflate = false
        }

        this.pingInterval = options.pingInterval || 10

        this.server = new WebSocket.Server(options)
        this.server.on('listening', () => {
            this.emit('listening')
        })
        this.server.on('error', (cause: any) => {
            this.emit('error', new VError({ name: 'WebSocketError', cause }, 'server error'))
        })
        this.server.on('connection', this.connectionHandler.bind(this))
        this.server.on('headers', (headers) => {
            this.emit('headers', headers)
        })
    }

    /**
     * Implement a RPC method defined in a protobuf service.
     */
    public implement(method: protobuf.Method | string, handler: Handler): void
    public implement(service: protobuf.Service | string, method: protobuf.Method | string, handler: Handler): void

    public implement(service: any, method: any, handler: any = null): void {
        if (!handler) {
            handler = method
            method = service
            service = this.resolveService(method)
        }

        return this.implementServiceMethod(service, method, handler)
    }

    /**
     * Send event to all connected clients. {@see Connection.send}
     */
    public async broadcast(name: string, payload?: Uint8Array) {
        const promises = this.connections.map((connection) => {
            connection.send(name, payload)
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

    /**
     * Get a service name for the given method.
     * If we only have a single service use it as a default.
     */
    private resolveService(method: string | protobuf.Method): string {
        if (Object.keys(this.services).length === 0) {
            throw new Error('There are no services!')
        }

        if (typeof method === 'string') {
            if (Object.keys(this.services).length > 1) {
                throw new Error('There is no default service! You have to specify the service at the method implementation')
            }

            return Object.keys(this.services)[0]
        }

        if (!method.parent || !method.parent.name) {
            throw new Error('Failed implement orphan method!')
        }

        return method.parent.name[0].toUpperCase() + method.parent.name.substring(1)
    }

    /**
     * Register a handler for an rpc method of the service.
     */
    private implementServiceMethod(
        service: protobuf.Service | string,
        method: protobuf.Method | string,
        handler: Handler,
    ): void {
        let serviceName
        if (typeof service === 'string') {
            serviceName = service[0].toUpperCase() + service.substring(1)
        } else {
            serviceName = service.name
        }

        service = this.services[serviceName]
        if (!service) {
            throw new Error('Invalid service')
        }

        if (typeof method === 'string') {
            const methodName = method[0].toUpperCase() + method.substring(1)
            method = service.methods[methodName]
        }

        if (service.methodsArray.indexOf(method) === -1) {
            throw new Error('Invalid method')
        }

        method.resolve()
        this.handlers[serviceName][method.name] = handler
    }

    private connectionHandler(socket: WebSocket) {
        const connection = new Connection(socket, this, ++this.connectionCounter)
        this.connections.push(connection)

        connection.on('error', (cause: Error) => {
            const error: Error = new VError({ name: 'ConnectionError', cause }, 'connection error')
            this.emit('error', error)
        })

        let pingTimer: NodeJS.Timer
        if (this.pingInterval !== 0) {
            pingTimer = setInterval(() => {
                socket.ping()
            }, this.pingInterval * 1000)
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
