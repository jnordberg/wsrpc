
# [wsrpc](https://github.com/jnordberg/wsrpc) [![Build Status](https://img.shields.io/travis/jnordberg/wsrpc.svg?style=flat-square)](https://travis-ci.org/jnordberg/wsrpc) [![Coverage Status](https://img.shields.io/coveralls/jnordberg/wsrpc.svg?style=flat-square)](https://coveralls.io/github/jnordberg/wsrpc?branch=master) [![Package Version](https://img.shields.io/npm/v/wsrpc.svg?style=flat-square)](https://www.npmjs.com/package/wsrpc) ![License](https://img.shields.io/npm/l/wsrpc.svg?style=flat-square)

node.js/browser protobuf rpc over binary websockets.

* **[Demo](https://johan-nordberg.com/wspainter)** ([source](https://github.com/jnordberg/wsrpc/tree/master/examples/painter))
* [Documentation](https://jnordberg.github.io/wsrpc/)
* [Issues](https://github.com/jnordberg/wsrpc/issues)

---

## Examples

### Single service usage

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

### Multi service usage

You can use a single server to implement multiple rpc services.
The services can be in a single or multiple separate `.proto` files.

> WARNING: Service names must be unique!

> NOTE: The same `message` or `rpc` method names can be used in multiple services.
> To avoid collisions between them across different services you should use a unique `package` identifier in every `.proto` file.  


service1.proto
```protobuf
package service1

service Service1 {
    rpc SayHello (HelloRequest) returns (HelloResponse) {}
}

message HelloRequest {
    required string name = 1;
}

message HelloResponse {
    required string text = 1;
}
```

service2.proto
```protobuf
package service2

service Service2 {
    rpc SayHello (HelloRequest) returns (HelloResponse) {}
    rpc SayHi (HelloRequest) returns (HelloResponse) {}
}

message HelloRequest {
    required string to = 1;
}

message HelloResponse {
    required string text = 1;
    required string from = 2;
    required string to = 3;
}
```

server.js
```typescript
const wsrpc = require('wsrpc')
const protobuf = require('protobufjs')

const proto = protobuf.loadSync(['service1.proto', 'service2.proto'])

const service1 = proto.lookupService('Service1')
const service2 = proto.lookupService('Service2')

const services = [
    service1,
    service2
]

const server = new wsrpc.Server(services, { port: 4242 })

// If the method is a string you have to specify the service!
server.implement('Service1', 'sayHello', async (request) => {
    return {text: `Hello ${ request.name } from Service1!`}
})

server.implement(service2, 'sayHello', async (request) => {
    return {text: `Hello ${ request.to } from Service2!`}
})

// If you pass in a Method instance the service will be resolved automatically
server.implement(service2.methods.SayHi, async (request) => {
    return {text: `Hi ${ request.to }!`, from: 'Service2', to: request.name}
})
```

client.js
```typescript
const wsrpc = require('wsrpc')
const protobuf = require('protobufjs')

const proto = protobuf.loadSync(['service1.proto', 'service2.proto'])

const service1 = proto.lookupService('Service1')
const service2 = proto.lookupService('Service2')

const services = [
    service1,
    service2
]

const client = new wsrpc.Client('ws://localhost:4242', services)
let response

response = await client.services.Service1.sayHello({name: 'world1'})
console.log(response.text) // Hello world1 from Service1!

response = await client.services.Service2.sayHello({to: 'world2'})
console.log(response.text) // Hello world2 from Service2!

response = await client.services.Service2.sayHi({to: 'world3'})
console.log(response.text) // Hi world3!
console.log(response.from) // Service2
console.log(response.to) // world3
```
