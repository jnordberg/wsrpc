import * as protobuf from 'protobufjs/minimal'

export interface IProtobufType {
    encode(message: any, writer?: protobuf.Writer): protobuf.Writer

    decode(reader: (protobuf.Reader | Uint8Array), length?: number): any
}
