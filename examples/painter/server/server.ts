import * as wsrpc from 'wsrpc'
import * as protobuf from 'protobufjs'
import * as zlib from 'zlib'
import * as Canvas from 'canvas'
import * as fs from 'fs'
import * as path from 'path'
import * as sharp from 'sharp'

import {PaintEvent, StatusEvent, CanvasRequest} from './../protocol/service'
import * as shared from './../shared/paint'

const proto = protobuf.loadSync(`${ __dirname }/../protocol/service.proto`)

const canvas = Canvas.createCanvas(shared.canvasWidth, shared.canvasHeight)
const ctx = canvas.getContext('2d')
ctx.patternQuality = 'fast'
ctx.filter = 'fast'
ctx.antialias = 'none'

try {
    const img = new Canvas.Image()
    img.src = fs.readFileSync('canvas.jpeg')
    ctx.drawImage(img, 0, 0)
} catch (error) {
    if (error.code !== 'ENOENT') {
        throw error
    }
}

async function saveCanvas() {
    const width = shared.canvasWidth
    const height = shared.canvasHeight
    const imageData = ctx.getImageData(0, 0, width, height)
    const imageBuffer = Buffer.from(imageData.data.buffer)
    await sharp(imageBuffer, {raw: {channels: 4, width, height}})
        .flatten({ background: '#ffffff'})
        .jpeg({quality: 90, chromaSubsampling: '4:4:4'})
        .toFile('canvas.jpeg')
}

process.on('SIGINT', async () => {
    console.log('saving canvas...')
    await saveCanvas()
    console.log('saved')
    process.exit()
})

let canvasDirty = false
if (process.env['SAVE_INTERVAL'] && process.env['SAVE_DIR']) {
    const interval = parseInt(process.env['SAVE_INTERVAL'])
    const dir = process.env['SAVE_DIR']
    console.log(`saving canvas to ${ dir } every ${ interval } seconds`)
    const save = async () => {
        if (!canvasDirty) {
            return
        }
        const filename = path.join(dir, `canvas-${ new Date().toISOString() }.jpeg`)
        console.log(`saving canvas to ${ filename }`)
        await saveCanvas()
        fs.createReadStream('canvas.jpeg').pipe(fs.createWriteStream(filename));
        canvasDirty = false
    }
    setInterval(save, interval * 1000)
}

const server = new wsrpc.Server(proto.lookupService('Painter') as any, {
    port: 4242,
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
    let {offset, width, height} = request
    if (offset.x < 0 || offset.y < 0 ||
        offset.x + width > shared.canvasWidth ||
        offset.y + height > shared.canvasHeight) {
        throw new Error('Out of bounds')
    }
    const imageData = ctx.getImageData(offset.x, offset.y, width, height)
    const imageBuffer = Buffer.from(imageData.data.buffer)
    const image = sharp(imageBuffer, {raw: {width, height, channels: 4}})
    let responseImage: Buffer
    switch (request.encoding) {
        case CanvasRequest.Encoding.JPEG:
            responseImage = await image
                .flatten({ background: '#ffffff' }).jpeg().toBuffer()
            break
        case CanvasRequest.Encoding.WEBP:
            responseImage = await image.webp().toBuffer()
            break
        case CanvasRequest.Encoding.PNG:
            responseImage = await image.png().toBuffer()
            break
        default:
            throw new Error('Invalid encoding')
    }
    return {image: responseImage}
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
