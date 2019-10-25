import {IPaintEvent} from './../protocol/service'
const Canvas = require('canvas')
import * as LRUCache from 'lru-cache'

export const canvasWidth = process.env['CANVAS_WIDTH'] ? parseInt(process.env['CANVAS_WIDTH']) : 4096
export const canvasHeight = process.env['CANVAS_HEIGHT'] ? parseInt(process.env['CANVAS_HEIGHT']) :4096
export const brushSize = 124

const brushCache = new LRUCache<number, HTMLCanvasElement>({max: 20})
const brushImage = new Canvas.Image()
brushImage.src = require('./brush')

let brushData: Uint8ClampedArray

function createCanvas(width: number, height: number):HTMLCanvasElement {
    if (process.title === 'browser') {
        const rv = document.createElement('canvas')
        rv.width = width
        rv.height = height
        return rv
    } else {
        return new Canvas.createCanvas(width, height)
    }
}

function getBrush(color: number):HTMLCanvasElement {
    if (brushCache.has(color)) {
        return brushCache.get(color)
    }

    const r = (color >> 16) & 0xff
    const g = (color >> 8) & 0xff
    const b = color & 0xff

    const brush = createCanvas(brushSize, brushSize)
    const ctx = brush.getContext('2d')

    if (!brushData) {
        ctx.drawImage(brushImage, 0, 0)
        brushData = ctx.getImageData(0, 0, brushSize, brushSize).data
    }

    const imageData = ctx.createImageData(brushSize, brushSize)

    for (let i = 0; i < brushData.length; i+=4) {
        imageData.data[i]   = r
        imageData.data[i+1] = g
        imageData.data[i+2] = b
        imageData.data[i+3] = brushData[i+3]
    }

    ctx.putImageData(imageData, 0, 0)

    brushCache.set(color, brush)
    return brush
}

export function paint(event: IPaintEvent, ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = 0.4
    ctx.globalCompositeOperation = 'source-over'

    if (event.size < 1 || event.size > brushSize) {
        throw new Error('Invalid size')
    }

    if (Math.abs(event.pos.x) > 0xffff || Math.abs(event.pos.y) > 0xffff) {
        throw new Error('Invalid position')
    }

    if (event.color > 0xffffff) {
        throw new Error('Invalid color')
    }

    const offset = ~~(event.size / 2)
    const x = ~~(event.pos.x - offset)
    const y = ~~(event.pos.y - offset)
    const s = ~~event.size

    ctx.drawImage(getBrush(event.color), x, y, s, s)
}
