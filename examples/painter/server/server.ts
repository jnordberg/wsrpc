
const wsrpc = require('wsrpc')
const protobuf = require('protobufjs')
const Canvas = require('canvas')
const zlib = require('zlib')

import * as fs from 'fs'

import {PaintEvent, StatusEvent, CanvasRequest} from './../protocol/service'
import * as shared from './../shared/paint'

const proto = protobuf.loadSync(`${ __dirname }/../protocol/service.proto`)

const width = 2024
const height = 2024

const canvas = new Canvas()
canvas.width = width
canvas.height = height

const ctx = canvas.getContext('2d')

try {
    const img = new Canvas.Image()
    img.src = fs.readFileSync('canvas.png')
    ctx.drawImage(img, 0, 0)
} catch (error) {
    if (error.code !== 'ENOENT') {
        throw error
    }
}

function saveCanvas() {
    console.log('saving canvas')
    var data = canvas.toBuffer(undefined, 3, canvas.PNG_FILTER_NONE)
    fs.writeFileSync('canvas.png', data)
    process.exit()
}
process.on('SIGINT', saveCanvas)
process.on('exit', saveCanvas)

const server = new wsrpc.Server({
    port: 4242,
    service: proto.lookupService('Painter')
})

server.implement('paint', async (event, sender) => {
    shared.paint(event, ctx)
    const broadcast = PaintEvent.encode(event).finish()
    for (const connection of server.connections) {
        if (connection === sender) {
            continue
        }
        connection.send('paint', broadcast)
    }
})

server.implement('getCanvas', async (request: CanvasRequest) => {
    if (request.width > width || request.height > height) {
        throw new Error('Too large')
    }
    const imageData = ctx.getImageData(0, 0, request.width, request.height)
    return new Promise((resolve, reject) => {
        const buffer = Buffer.from(imageData.data.buffer)
        zlib.gzip(buffer, (error, image) => {
            if (error) { reject(error) } else { resolve({image}) }
        })
    })
})

const broadcastStatus = () => {
    const data = StatusEvent.encode({users: server.connections.length}).finish()
    server.broadcast('status', data)
}

server.on('connection', (connection) => {
    broadcastStatus()
    connection.once('close', broadcastStatus)
})

server.on('error', (error) => {
    console.log('error', error.message)
})

server.on('listening', () => {
    console.log(`listening on ${ server.options.port }`)
})
