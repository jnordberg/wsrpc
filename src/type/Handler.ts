import { Connection } from '../Connection'
import { Message } from './Message'

export type Handler = (request: Message, connection: Connection) => Promise<Message>
