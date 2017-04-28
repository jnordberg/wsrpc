
const wsrpc = require('wsrpc')
const protobuf = require('protobufjs')

const proto = protobuf.loadSync(`${ __dirname }/service.proto`)
const PaintMessage = proto.lookupType('PaintMessage')
const StatusMessage = proto.lookupType('StatusMessage')

const server = new wsrpc.Server({
    port: 4242,
    service: proto.lookupService('Painter')
})

server.implement('paint', (message) => {
    server.broadcast('paint', PaintMessage.encode(message).finish())
    return Promise.resolve({})
})

const broadcastStatus = () => {
    const data = StatusMessage.encode({users: server.connections.length}).finish()
    server.broadcast('status', data)
}

server.on('connection', (connection) => {
    broadcastStatus()
    connection.once('close', broadcastStatus)
})
