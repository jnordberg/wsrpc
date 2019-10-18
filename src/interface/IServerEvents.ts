import { Connection } from '../Connection'

export interface IServerEvents {
    on(event: 'connection', listener: (connection: Connection) => void): void

    on(event: 'error', listener: (error: Error) => void): void
}
