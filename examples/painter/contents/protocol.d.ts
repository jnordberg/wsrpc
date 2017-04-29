import * as $protobuf from "protobufjs";

/** Represents a Painter */
export class Painter extends $protobuf.rpc.Service {

    /**
     * Constructs a new Painter service.
     * @param rpcImpl RPC implementation
     * @param [requestDelimited=false] Whether requests are length-delimited
     * @param [responseDelimited=false] Whether responses are length-delimited
     */
    constructor(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean);

    /**
     * Creates new Painter service using the specified rpc implementation.
     * @param rpcImpl RPC implementation
     * @param [requestDelimited=false] Whether requests are length-delimited
     * @param [responseDelimited=false] Whether responses are length-delimited
     * @returns RPC service. Useful where requests and/or responses are streamed.
     */
    public static create(rpcImpl: $protobuf.RPCImpl, requestDelimited?: boolean, responseDelimited?: boolean): Painter;

    /**
     * Calls Paint.
     * @param request PaintMessage message or plain object
     * @param callback Node-style callback called with the error, if any, and Empty
     */
    public paint(request: IPaintMessage, callback: Painter.PaintCallback): void;

    /**
     * Calls Paint.
     * @param request PaintMessage message or plain object
     * @returns Promise
     */
    public paint(request: IPaintMessage): Promise<Empty>;
}

export namespace Painter {

    /**
     * Callback as used by {@link Painter#paint}.
     * @param error Error, if any
     * @param [response] Empty
     */
    type PaintCallback = (error: (Error|null), response?: Empty) => void;
}

/** Properties of an Empty. */
export interface IEmpty {
}

/** Represents an Empty. */
export class Empty {

    /**
     * Constructs a new Empty.
     * @param [properties] Properties to set
     */
    constructor(properties?: IEmpty);

    /**
     * Creates a new Empty instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Empty instance
     */
    public static create(properties?: IEmpty): Empty;

    /**
     * Encodes the specified Empty message. Does not implicitly {@link Empty.verify|verify} messages.
     * @param message Empty message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IEmpty, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Empty message, length delimited. Does not implicitly {@link Empty.verify|verify} messages.
     * @param message Empty message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IEmpty, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an Empty message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Empty
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Empty;

    /**
     * Decodes an Empty message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Empty
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Empty;

    /**
     * Verifies an Empty message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an Empty message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Empty
     */
    public static fromObject(object: { [k: string]: any }): Empty;

    /**
     * Creates a plain object from an Empty message. Also converts values to other types if specified.
     * @param message Empty
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Empty, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Empty to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of a PaintMessage. */
export interface IPaintMessage {

    /** PaintMessage x */
    x: number;

    /** PaintMessage y */
    y: number;

    /** PaintMessage size */
    size: number;

    /** PaintMessage color */
    color: number;
}

/** Represents a PaintMessage. */
export class PaintMessage {

    /**
     * Constructs a new PaintMessage.
     * @param [properties] Properties to set
     */
    constructor(properties?: IPaintMessage);

    /** PaintMessage x. */
    public x: number;

    /** PaintMessage y. */
    public y: number;

    /** PaintMessage size. */
    public size: number;

    /** PaintMessage color. */
    public color: number;

    /**
     * Creates a new PaintMessage instance using the specified properties.
     * @param [properties] Properties to set
     * @returns PaintMessage instance
     */
    public static create(properties?: IPaintMessage): PaintMessage;

    /**
     * Encodes the specified PaintMessage message. Does not implicitly {@link PaintMessage.verify|verify} messages.
     * @param message PaintMessage message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IPaintMessage, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified PaintMessage message, length delimited. Does not implicitly {@link PaintMessage.verify|verify} messages.
     * @param message PaintMessage message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IPaintMessage, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a PaintMessage message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns PaintMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): PaintMessage;

    /**
     * Decodes a PaintMessage message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns PaintMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): PaintMessage;

    /**
     * Verifies a PaintMessage message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a PaintMessage message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns PaintMessage
     */
    public static fromObject(object: { [k: string]: any }): PaintMessage;

    /**
     * Creates a plain object from a PaintMessage message. Also converts values to other types if specified.
     * @param message PaintMessage
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: PaintMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this PaintMessage to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of a StatusMessage. */
export interface IStatusMessage {

    /** StatusMessage users */
    users: number;
}

/** Represents a StatusMessage. */
export class StatusMessage {

    /**
     * Constructs a new StatusMessage.
     * @param [properties] Properties to set
     */
    constructor(properties?: IStatusMessage);

    /** StatusMessage users. */
    public users: number;

    /**
     * Creates a new StatusMessage instance using the specified properties.
     * @param [properties] Properties to set
     * @returns StatusMessage instance
     */
    public static create(properties?: IStatusMessage): StatusMessage;

    /**
     * Encodes the specified StatusMessage message. Does not implicitly {@link StatusMessage.verify|verify} messages.
     * @param message StatusMessage message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IStatusMessage, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified StatusMessage message, length delimited. Does not implicitly {@link StatusMessage.verify|verify} messages.
     * @param message StatusMessage message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IStatusMessage, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a StatusMessage message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns StatusMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): StatusMessage;

    /**
     * Decodes a StatusMessage message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns StatusMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): StatusMessage;

    /**
     * Verifies a StatusMessage message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a StatusMessage message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns StatusMessage
     */
    public static fromObject(object: { [k: string]: any }): StatusMessage;

    /**
     * Creates a plain object from a StatusMessage message. Also converts values to other types if specified.
     * @param message StatusMessage
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: StatusMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this StatusMessage to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}
