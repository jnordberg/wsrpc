
import {Client} from 'wsrpc'
import {Painter, PaintEvent, StatusEvent, IPaintEvent} from './../../protocol/service'
import * as zlib from 'browserify-zlib-next'
import * as shared from './../../shared/paint'

interface Position {
    x: number
    y: number
    timestamp: number
}

interface DrawEvent {
    pos: Position
    lastPos?: Position
    force?: number
    color: number
}

const colors = [
    0x467588,
    0xFFFFFF,
    0xFCE5BC,
    0xFDCD92,
    0xFCAC96,
    0xDD8193,
]

function randomColor()  {
    return colors[Math.floor(colors.length * Math.random())]
}

let now: () => number
if (window.performance) {
    now = () => window.performance.now()
} else {
    now = () => Date.now()
}

const client = new Client('ws://localhost:4242', Painter, {
    sendTimeout: 5000,
    eventTypes: {
        paint: PaintEvent,
        status: StatusEvent,
    }
})

client.on('open', () => {
    document.documentElement.classList.add('connected')
})

client.on('close', () => {
    document.documentElement.classList.remove('connected')
})

window.addEventListener('DOMContentLoaded', async () => {
    const status = document.createElement('div')
    status.className = 'status'
    status.innerHTML = 'Connecting...'
    document.body.appendChild(status)

    client.on('event status', (event: StatusEvent) => {
        status.innerHTML = `Users: ${ event.users }`
    })

    client.on('close', () => {
        status.innerHTML = 'Disconnected'
    })

    client.on('error', (error) => {
        console.warn('client error', error)
    })

    let activeColor: number = colors[0]

    const colorWells: HTMLSpanElement[] = []
    const colorPicker = document.createElement('div')
    colorPicker.className = 'picker'
    for (const color of colors) {
        const well = document.createElement('span')
        const cssColor = '#' + color.toString(16)
        well.style.backgroundColor = cssColor
        well.style.outlineColor = cssColor
        well.addEventListener('click', (event) => {
            event.preventDefault()
            colorWells.forEach((el) => el.classList.remove('active'))
            well.classList.add('active')
            activeColor = color
        })
        colorWells.push(well)
        colorPicker.appendChild(well)
    }
    document.body.appendChild(colorPicker)

    colorWells[0].classList.add('active')

    const canvas = document.querySelector('canvas')
    const ctx = canvas.getContext('2d')

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    client.on('event paint', (event: PaintEvent) => {
        shared.paint(event, ctx)
    })

    const loadingEl = document.createElement('div')
    loadingEl.className = 'loading'
    loadingEl.innerHTML = 'Loading canvas...'
    document.body.appendChild(loadingEl)

    async function fetchCanvas() {
        document.documentElement.classList.add('loading')

        const request = {
            width: Math.min(window.innerWidth, shared.canvasWidth),
            height: Math.min(window.innerHeight, shared.canvasHeight),
        }
        console.log('loading canvas...', request)
        const response = await client.service.getCanvas(request)

        console.log(`response size: ${ ~~(response.image.length / 1024) }kb`)

        const arr = response.image
        let buffer = Buffer.from(arr.buffer)
        buffer = buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength)

        const data = await new Promise<Buffer>((resolve, reject) => {
            zlib.gunzip(buffer, (error, result) => {
                if (error) { reject(error) } else { resolve(result) }
            })
        })

        console.log(`decompressed: ${ ~~(data.length / 1024) }kb`)

        const imageData = ctx.createImageData(request.width, request.height)
        imageData.data.set(new Uint8ClampedArray(data.buffer))
        ctx.putImageData(imageData, 0, 0)

        document.documentElement.classList.remove('loading')
    }

    let debounceTimer
    window.addEventListener('resize', () => {
        if (window.innerWidth <= canvas.width && window.innerHeight <= canvas.height) {
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            ctx.putImageData(data, 0, 0)
        } else {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(fetchCanvas, 500)
            document.documentElement.classList.add('loading')
        }
    })

    await fetchCanvas()

    async function drawAsync(event: DrawEvent) {
        let msgs: IPaintEvent[] = []
        let size = 20
        const color = event.color
        if (event.force) {
            size = Math.min(size + event.force * (shared.brushSize - 20), shared.brushSize)
        }
        if (event.lastPos) {
            const dx = event.lastPos.x - event.pos.x
            const dy = event.lastPos.y - event.pos.y
            const d = Math.sqrt(dx*dx + dy*dy)
            if (!event.force) {
                const dt = event.pos.timestamp - event.lastPos.timestamp
                size = Math.min(size + 20 * (d / dt), shared.brushSize)
            }
            const interpSteps = ~~(d / (size / 4))
            for (let i = 0; i < interpSteps; i++) {
                const p = (i + 1) / (interpSteps + 1)
                const x = event.lastPos.x * p + event.pos.x * (1 - p)
                const y = event.lastPos.y * p + event.pos.y * (1 - p)
                msgs.push({x, y, color, size})
            }
        }
        msgs.push({
            x: event.pos.x,
            y: event.pos.y,
            color: event.color,
            size: Math.min(size, shared.brushSize),
        })
        let drawCalls = []
        for (const msg of msgs) {
            shared.paint(msg, ctx)
            drawCalls.push(client.service.paint(msg))
        }
        await Promise.all(drawCalls)
    }

    function draw(event: DrawEvent) {
        drawAsync(event).catch((error) => {
            console.warn('error drawing', error)
        })
    }

    let mouseDraw: DrawEvent|undefined

    canvas.addEventListener('mousedown', (event) => {
        mouseDraw = {
            pos: {
                x: event.x,
                y: event.y,
                timestamp: now(),
            },
            color: activeColor,
        }
        draw(mouseDraw)
        event.preventDefault()
    })

    canvas.addEventListener('mousemove', (event) => {
        if (mouseDraw) {
            mouseDraw.lastPos = mouseDraw.pos
            mouseDraw.pos = {
                x: event.x,
                y: event.y,
                timestamp: now(),
            }
            draw(mouseDraw)
        }
    })

    const mouseup = (event) => {
        mouseDraw = undefined
    }
    canvas.addEventListener('mouseup', mouseup)
    canvas.addEventListener('mouseleave', mouseup)

    let fingerDraw: {[id: number]: DrawEvent} = {}

    canvas.addEventListener('touchstart', (event) => {
        for (var i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i]
            fingerDraw[touch.identifier] = {
                pos: {
                    x: touch.screenX,
                    y: touch.screenY,
                    timestamp: now(),
                },
                force: touch['force'],
                color: activeColor
            }
            draw(fingerDraw[touch.identifier])
        }
        event.preventDefault()
    })

    canvas.addEventListener('touchmove', (event) => {
        for (var i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i]
            const drawEvent = fingerDraw[touch.identifier]
            if (drawEvent) {
                drawEvent.lastPos = drawEvent.pos
                drawEvent.pos = {
                    x: touch.screenX,
                    y: touch.screenY,
                    timestamp: now(),
                }
                drawEvent.force = touch['force']
                draw(drawEvent)
            }
        }
        event.preventDefault()
    })

    const touchend = (event: TouchEvent) => {
        for (var i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i]
            delete fingerDraw[touch.identifier]
        }
        event.preventDefault()
    }
    canvas.addEventListener('touchend', touchend)
    canvas.addEventListener('touchcancel', touchend)
})

console.log(' ;-) ')
window['client'] = client
