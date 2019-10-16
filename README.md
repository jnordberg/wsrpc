
# [wsrpc](https://github.com/jnordberg/wsrpc) [![Build Status](https://img.shields.io/travis/jnordberg/wsrpc.svg?style=flat-square)](https://travis-ci.org/jnordberg/wsrpc) [![Coverage Status](https://img.shields.io/coveralls/jnordberg/wsrpc.svg?style=flat-square)](https://coveralls.io/github/jnordberg/wsrpc?branch=master) [![Package Version](https://img.shields.io/npm/v/wsrpc.svg?style=flat-square)](https://www.npmjs.com/package/wsrpc) ![License](https://img.shields.io/npm/l/wsrpc.svg?style=flat-square)

node.js/browser protobuf rpc over binary websockets.

* **[Demo](https://johan-nordberg.com/wspainter)** ([source](https://github.com/jnordberg/wsrpc/tree/master/examples/painter))
* [Documentation](https://jnordberg.github.io/wsrpc/)
* [Issues](https://github.com/jnordberg/wsrpc/issues)

---

Minimal example
---------------

my-service.proto
```protobuf
service MyService {
    rpc SayHello (HelloRequest) returns (HelloResponse) {}
}

message HelloRequest {
    required string name = 1;
}

message HelloResponse {
    required string text = 1;
}
```

server.js
```typescript
const wsrpc = require('wsrpc')
const protobuf = require('protobufjs')

const proto = protobuf.loadSync('my-service.proto')

const server = new wsrpc.Server(proto.lookupService('MyService'), { port: 4242 })

server.implement('sayHello', async (request) => {
    return {text: `Hello ${ request.name }!`}
})
```

client.js
```typescript
const wsrpc = require('wsrpc')
const protobuf = require('protobufjs')

const proto = protobuf.loadSync('my-service.proto')

const client = new wsrpc.Client('ws://localhost:4242', proto.lookupService('MyService'))

const response = await client.service.sayHello({name: 'world'})
console.log(response) // Hello world!
```
