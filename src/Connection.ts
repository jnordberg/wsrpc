import { EventEmitter } from 'events'
import * as WebSocket from 'uws'
import { VError } from 'verror'
import * as RPC from '../protocol/rpc'

import { Message } from './type/Message'

import { Server } from './Server'

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
        socket.on('close', () => {
            this.emit('close')
        })
        socket.on('error', (error) => {
            this.emit('error', error)
        })
    }

    /**
     * Send event to client with optional payload.
     */
    public send(name: string, payload?: Uint8Array): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const event: RPC.IEvent = { name }
            if (payload) {
                event.payload = payload
            }
            const message = RPC.Message.encode({
                event, type: RPC.Message.Type.EVENT,
            }).finish()
            this.socket.send(message, (error) => {
                if (error) {
                    reject(error)
                } else {
                    resolve()
                }
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
        const serviceName = request.service[0].toUpperCase() + request.service.substring(1)
        const methodName = request.method[0].toUpperCase() + request.method.substring(1)

        const service = this.server.services[serviceName]
        const serviceHandlers = this.server.handlers[serviceName]
        if (!service || !serviceHandlers) {
            throw new Error('Invalid service')
        }
        const method = service.methods[methodName]
        if (!method) {
            throw new Error('Invalid method')
        }

        const impl = serviceHandlers[methodName]
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

        const response = new RPC.Response({ seq: request.seq, ok: true })
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
            const error = new VError({ name: 'RequestError', cause }, 'could not decode message')
            this.emit('error', error)
            return
        }
        this.requestHandler(request).then((response) => {
            const message = RPC.Message.encode({ type: RPC.Message.Type.RESPONSE, response }).finish()
            this.socket.send(message)
        }).catch((error: Error) => {
            const message = RPC.Message.encode({
                response: {
                    error: error.message,
                    ok: false,
                    seq: request.seq,
                },
                type: RPC.Message.Type.RESPONSE,
            }).finish()
            this.socket.send(message)
            setImmediate(() => {
                // this avoids the promise swallowing the error thrown
                // by emit 'error' when no listeners are present
                this.emit('error', error)
            })
        })
    }
}
