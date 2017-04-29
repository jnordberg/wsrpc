
# [wsrpc](https://github.com/jnordberg/wsrpc)

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

const server = new wsrpc.Server({
    port: 4242,
    service: proto.lookupService('MyService')
})

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
