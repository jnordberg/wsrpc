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
    on(event: 'event', listener: (name: string, data?: Uint8Array | {[k: string]: any}) => void): this

    on(event: 'event <name>', listener: (data?: Uint8Array | {[k: string]: any}) => void): this
}
