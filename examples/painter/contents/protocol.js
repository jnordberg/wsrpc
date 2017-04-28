/*eslint-disable block-scoped-var, no-redeclare, no-control-regex, no-prototype-builtins*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.Painter = (function() {

    /**
     * Constructs a new Painter service.
     * @exports Painter
     * @classdesc Represents a Painter
     * @extends $protobuf.rpc.Service
     * @constructor
     * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
     * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
     * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
     */
    function Painter(rpcImpl, requestDelimited, responseDelimited) {
        $protobuf.rpc.Service.call(this, rpcImpl, requestDelimited, responseDelimited);
    }

    (Painter.prototype = Object.create($protobuf.rpc.Service.prototype)).constructor = Painter;

    /**
     * Creates new Painter service using the specified rpc implementation.
     * @param {$protobuf.RPCImpl} rpcImpl RPC implementation
     * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
     * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
     * @returns {Painter} RPC service. Useful where requests and/or responses are streamed.
     */
    Painter.create = function create(rpcImpl, requestDelimited, responseDelimited) {
        return new this(rpcImpl, requestDelimited, responseDelimited);
    };

    /**
     * Callback as used by {@link Painter#paint}.
     * @memberof Painter
     * @typedef PaintCallback
     * @type {function}
     * @param {Error|null} error Error, if any
     * @param {Empty} [response] Empty
     */

    /**
     * Calls Paint.
     * @param {IPaintMessage} request PaintMessage message or plain object
     * @param {Painter.PaintCallback} callback Node-style callback called with the error, if any, and Empty
     * @returns {undefined}
     */
    Painter.prototype.paint = function paint(request, callback) {
        return this.rpcCall(paint, $root.PaintMessage, $root.Empty, request, callback);
    };

    /**
     * Calls Paint.
     * @memberof Painter.prototype
     * @function paint
     * @param {IPaintMessage} request PaintMessage message or plain object
     * @returns {Promise<Empty>} Promise
     * @variation 2
     */

    return Painter;
})();

$root.Empty = (function() {

    /**
     * Properties of an Empty.
     * @exports IEmpty
     * @interface IEmpty
     */

    /**
     * Constructs a new Empty.
     * @exports Empty
     * @classdesc Represents an Empty.
     * @constructor
     * @param {IEmpty=} [properties] Properties to set
     */
    function Empty(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Creates a new Empty instance using the specified properties.
     * @param {IEmpty=} [properties] Properties to set
     * @returns {Empty} Empty instance
     */
    Empty.create = function create(properties) {
        return new Empty(properties);
    };

    /**
     * Encodes the specified Empty message. Does not implicitly {@link Empty.verify|verify} messages.
     * @param {IEmpty} message Empty message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Empty.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        return writer;
    };

    /**
     * Encodes the specified Empty message, length delimited. Does not implicitly {@link Empty.verify|verify} messages.
     * @param {IEmpty} message Empty message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Empty.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an Empty message from the specified reader or buffer.
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Empty} Empty
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Empty.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.Empty();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an Empty message from the specified reader or buffer, length delimited.
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Empty} Empty
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Empty.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an Empty message.
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Empty.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        return null;
    };

    /**
     * Creates an Empty message from a plain object. Also converts values to their respective internal types.
     * @param {Object.<string,*>} object Plain object
     * @returns {Empty} Empty
     */
    Empty.fromObject = function fromObject(object) {
        if (object instanceof $root.Empty)
            return object;
        return new $root.Empty();
    };

    /**
     * Creates a plain object from an Empty message. Also converts values to other types if specified.
     * @param {Empty} message Empty
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Empty.toObject = function toObject() {
        return {};
    };

    /**
     * Converts this Empty to JSON.
     * @returns {Object.<string,*>} JSON object
     */
    Empty.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Empty;
})();

$root.PaintMessage = (function() {

    /**
     * Properties of a PaintMessage.
     * @exports IPaintMessage
     * @interface IPaintMessage
     * @property {number} x PaintMessage x
     * @property {number} y PaintMessage y
     * @property {number} color PaintMessage color
     */

    /**
     * Constructs a new PaintMessage.
     * @exports PaintMessage
     * @classdesc Represents a PaintMessage.
     * @constructor
     * @param {IPaintMessage=} [properties] Properties to set
     */
    function PaintMessage(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * PaintMessage x.
     * @type {number}
     */
    PaintMessage.prototype.x = 0;

    /**
     * PaintMessage y.
     * @type {number}
     */
    PaintMessage.prototype.y = 0;

    /**
     * PaintMessage color.
     * @type {number}
     */
    PaintMessage.prototype.color = 0;

    /**
     * Creates a new PaintMessage instance using the specified properties.
     * @param {IPaintMessage=} [properties] Properties to set
     * @returns {PaintMessage} PaintMessage instance
     */
    PaintMessage.create = function create(properties) {
        return new PaintMessage(properties);
    };

    /**
     * Encodes the specified PaintMessage message. Does not implicitly {@link PaintMessage.verify|verify} messages.
     * @param {IPaintMessage} message PaintMessage message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PaintMessage.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        writer.uint32(/* id 1, wireType 5 =*/13).float(message.x);
        writer.uint32(/* id 2, wireType 5 =*/21).float(message.y);
        writer.uint32(/* id 3, wireType 0 =*/24).int32(message.color);
        return writer;
    };

    /**
     * Encodes the specified PaintMessage message, length delimited. Does not implicitly {@link PaintMessage.verify|verify} messages.
     * @param {IPaintMessage} message PaintMessage message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    PaintMessage.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a PaintMessage message from the specified reader or buffer.
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {PaintMessage} PaintMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PaintMessage.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.PaintMessage();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.x = reader.float();
                break;
            case 2:
                message.y = reader.float();
                break;
            case 3:
                message.color = reader.int32();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        if (!message.hasOwnProperty("x"))
            throw $util.ProtocolError("missing required 'x'", { instance: message });
        if (!message.hasOwnProperty("y"))
            throw $util.ProtocolError("missing required 'y'", { instance: message });
        if (!message.hasOwnProperty("color"))
            throw $util.ProtocolError("missing required 'color'", { instance: message });
        return message;
    };

    /**
     * Decodes a PaintMessage message from the specified reader or buffer, length delimited.
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {PaintMessage} PaintMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    PaintMessage.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a PaintMessage message.
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    PaintMessage.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (typeof message.x !== "number")
            return "x: number expected";
        if (typeof message.y !== "number")
            return "y: number expected";
        if (!$util.isInteger(message.color))
            return "color: integer expected";
        return null;
    };

    /**
     * Creates a PaintMessage message from a plain object. Also converts values to their respective internal types.
     * @param {Object.<string,*>} object Plain object
     * @returns {PaintMessage} PaintMessage
     */
    PaintMessage.fromObject = function fromObject(object) {
        if (object instanceof $root.PaintMessage)
            return object;
        var message = new $root.PaintMessage();
        if (object.x != null)
            message.x = Number(object.x);
        if (object.y != null)
            message.y = Number(object.y);
        if (object.color != null)
            message.color = object.color | 0;
        return message;
    };

    /**
     * Creates a plain object from a PaintMessage message. Also converts values to other types if specified.
     * @param {PaintMessage} message PaintMessage
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    PaintMessage.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults) {
            object.x = 0;
            object.y = 0;
            object.color = 0;
        }
        if (message.x != null && message.hasOwnProperty("x"))
            object.x = options.json && !isFinite(message.x) ? String(message.x) : message.x;
        if (message.y != null && message.hasOwnProperty("y"))
            object.y = options.json && !isFinite(message.y) ? String(message.y) : message.y;
        if (message.color != null && message.hasOwnProperty("color"))
            object.color = message.color;
        return object;
    };

    /**
     * Converts this PaintMessage to JSON.
     * @returns {Object.<string,*>} JSON object
     */
    PaintMessage.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return PaintMessage;
})();

$root.StatusMessage = (function() {

    /**
     * Properties of a StatusMessage.
     * @exports IStatusMessage
     * @interface IStatusMessage
     * @property {number} users StatusMessage users
     */

    /**
     * Constructs a new StatusMessage.
     * @exports StatusMessage
     * @classdesc Represents a StatusMessage.
     * @constructor
     * @param {IStatusMessage=} [properties] Properties to set
     */
    function StatusMessage(properties) {
        if (properties)
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * StatusMessage users.
     * @type {number}
     */
    StatusMessage.prototype.users = 0;

    /**
     * Creates a new StatusMessage instance using the specified properties.
     * @param {IStatusMessage=} [properties] Properties to set
     * @returns {StatusMessage} StatusMessage instance
     */
    StatusMessage.create = function create(properties) {
        return new StatusMessage(properties);
    };

    /**
     * Encodes the specified StatusMessage message. Does not implicitly {@link StatusMessage.verify|verify} messages.
     * @param {IStatusMessage} message StatusMessage message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    StatusMessage.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        writer.uint32(/* id 1, wireType 0 =*/8).int32(message.users);
        return writer;
    };

    /**
     * Encodes the specified StatusMessage message, length delimited. Does not implicitly {@link StatusMessage.verify|verify} messages.
     * @param {IStatusMessage} message StatusMessage message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    StatusMessage.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a StatusMessage message from the specified reader or buffer.
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {StatusMessage} StatusMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    StatusMessage.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        var end = length === undefined ? reader.len : reader.pos + length, message = new $root.StatusMessage();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.users = reader.int32();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        if (!message.hasOwnProperty("users"))
            throw $util.ProtocolError("missing required 'users'", { instance: message });
        return message;
    };

    /**
     * Decodes a StatusMessage message from the specified reader or buffer, length delimited.
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {StatusMessage} StatusMessage
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    StatusMessage.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a StatusMessage message.
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    StatusMessage.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (!$util.isInteger(message.users))
            return "users: integer expected";
        return null;
    };

    /**
     * Creates a StatusMessage message from a plain object. Also converts values to their respective internal types.
     * @param {Object.<string,*>} object Plain object
     * @returns {StatusMessage} StatusMessage
     */
    StatusMessage.fromObject = function fromObject(object) {
        if (object instanceof $root.StatusMessage)
            return object;
        var message = new $root.StatusMessage();
        if (object.users != null)
            message.users = object.users | 0;
        return message;
    };

    /**
     * Creates a plain object from a StatusMessage message. Also converts values to other types if specified.
     * @param {StatusMessage} message StatusMessage
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    StatusMessage.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        var object = {};
        if (options.defaults)
            object.users = 0;
        if (message.users != null && message.hasOwnProperty("users"))
            object.users = message.users;
        return object;
    };

    /**
     * Converts this StatusMessage to JSON.
     * @returns {Object.<string,*>} JSON object
     */
    StatusMessage.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return StatusMessage;
})();

module.exports = $root;
