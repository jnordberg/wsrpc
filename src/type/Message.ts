import * as protobuf from 'protobufjs/minimal'

export type Message = protobuf.Message<{}> | {[k: string]: any}
