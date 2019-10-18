import * as protobuf from 'protobufjs/minimal'
import * as RPC from '../../protocol/rpc'

export interface IRPCMessage {
    callback: protobuf.RPCImplCallback,
    message?: RPC.IMessage,
    seq: number,
    timer?: NodeJS.Timer,
}
