import * as WebSocket from 'uws'
import { IProtobufType } from './IProtobufType'

/**
 * RPC Client options
 * ------------------
 * *Note* - The options inherited from `WebSocket.IClientOptions` are only
 * valid when running in node.js, they have no effect in the browser.
 */
export interface IClientOptions extends WebSocket.IClientOptions {
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
