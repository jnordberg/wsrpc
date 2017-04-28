/**
 * Misc utility function shared between client and server.
 */

import {EventEmitter} from 'events'

/**
 * Return a promise that will resove when a specific event is emitted.
 */
export function waitForEvent<T>(emitter: EventEmitter, eventName: string|symbol): Promise<T> {
    return new Promise((resolve, reject) => {
        emitter.once(eventName, resolve)
    })
}
