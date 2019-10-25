#!/usr/bin/env node

const wsrpc = require('wsrpc')
const protobuf = require('protobufjs')

const proto = protobuf.loadSync('service.proto')
const service = proto.lookupService('PingService')

const server = new wsrpc.Server(service, {port: 4242})

server.implement('ping', async (request) => {
    return {nonce: request.nonce, time: Date.now()}
})
/*
// node <7.6 version
server.implement('ping', (request) => {
    return Promise.resolve({nonce: request.nonce, time: Date.now()})
})
*/

server.on('listening', () => {
    console.log(`listening on ${ server.options.port }`)
})

server.on('error', (error) => {
    console.warn('error', error)
})

server.on('connection', (connection) => {
    console.log(`connection ${ connection.id }`)
    connection.once('close', () => {
        console.log(`connection ${ connection.id } closed`)
    })
})
