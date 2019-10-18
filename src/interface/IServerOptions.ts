import * as WebSocket from 'uws'

/**
 * RPC Server options
 * ------------------
 * Server options, extends the WebSocket server options.
 * Note that `WebSocket.IServerOptions.perMessageDeflate` defaults
 * to `false` if omitted.
 */
export interface IServerOptions extends WebSocket.IServerOptions {
    /**
     * How often to send a ping frame, in seconds. Set to 0 to disable. Default = 10.
     */
    pingInterval?: number
}
