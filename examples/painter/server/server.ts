import * as wsrpc from 'wsrpc'
import * as protobuf from 'protobufjs'
import * as zlib from 'zlib'
import * as Canvas from 'canvas'
import * as fs from 'fs'
import * as path from 'path'

import {PaintEvent, StatusEvent, CanvasRequest} from './../protocol/service'
import * as shared from './../shared/paint'

const proto = protobuf.loadSync(`${ __dirname }/../protocol/service.proto`)

const canvas = new Canvas(shared.canvasWidth, shared.canvasHeight)
const ctx = canvas.getContext('2d')
ctx.patternQuality = 'fast'
ctx.filter = 'fast'
ctx.antialias = 'none'

try {
    const img = new Canvas.Image()
    img.src = fs.readFileSync('canvas.png')
    ctx.drawImage(img, 0, 0)
} catch (error) {
    if (error.code !== 'ENOENT') {
        throw error
    }
}

process.on('exit', () => {
    console.log('saving canvas')
    fs.writeFileSync('canvas.png', canvas.toBuffer())
})
process.on('SIGINT', () => process.exit())

let canvasDirty = false
if (process.env['SAVE_INTERVAL'] && process.env['SAVE_DIR']) {
    const interval = parseInt(process.env['SAVE_INTERVAL'])
    const dir = process.env['SAVE_DIR']
    console.log(`saving canvas to ${ dir } every ${ interval } seconds`)
    const save = async () => {
        if (!canvasDirty) {
            console.log('canvas not dirty, skipping save')
            return
        }
        const filename = path.join(dir, `canvas-${ new Date().toISOString() }.png`)
        console.log(`saving canvas to ${ filename }`)
        canvas.pngStream().pipe(fs.createWriteStream(filename))
        canvasDirty = false
    }
    setInterval(save, interval * 1000)
}

const server = new wsrpc.Server({
    port: 4242,
    service: proto.lookupService('Painter')
})

server.implement('paint', async (event: PaintEvent, sender) => {
    shared.paint(event, ctx)
    canvasDirty = true
    const broadcast = PaintEvent.encode(event).finish()
    for (const connection of server.connections) {
        if (connection === sender) {
            continue
        }
        connection.send('paint', broadcast)
    }
    return {}
})

server.implement('getCanvas', async (request: CanvasRequest) => {
    if (request.width > shared.canvasWidth || request.height > shared.canvasHeight) {
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
