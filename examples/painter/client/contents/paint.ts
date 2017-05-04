import {Client} from 'wsrpc'
import {Painter, PaintEvent, StatusEvent, IPaintEvent, CanvasRequest} from './../../protocol/service'
import * as shared from './../../shared/paint'

interface DrawPosition {
    x: number
    y: number
    timestamp: number
}

interface DrawEvent {
    pos: DrawPosition
    lastPos?: DrawPosition
    lastV?: number
    force?: number
    color: number
}

const palettes = [
    [0x413E4A, 0x73626E, 0xB38184, 0xF0B49E, 0xF7E4BE, 0xFFFFFF],
    [0x00A8C6, 0x40C0CB, 0xF9F2E7, 0xFFFFFF, 0xAEE239, 0x8FBE00],
    [0x467588, 0xFFFFFF, 0xFCE5BC, 0xFDCD92, 0xFCAC96, 0xDD8193],
    [0xFFFFFF, 0xF8B195, 0xF67280, 0xC06C84, 0x6C5B7B, 0x355C7D],
    [0xFFFFFF, 0xCFF09E, 0xA8DBA8, 0x79BD9A, 0x3B8686, 0x0B486B],
    [0xFFFFFF, 0xEEE6AB, 0xC5BC8E, 0x696758, 0x45484B, 0x36393B],
    [0xFFFFFF, 0xFFED90, 0xA8D46F, 0x359668, 0x3C3251, 0x341139],
    [0x351330, 0x424254, 0x64908A, 0xE8CAA4, 0xFFFFFF, 0xCC2A41],
    [0xD9CEB2, 0x948C75, 0xD5DED9, 0x7A6A53, 0x99B2B7, 0xFFFFFF],
    [0x00A0B0, 0xFFFFFF, 0x6A4A3C, 0xCC333F, 0xEB6841, 0xEDC951],
    [0xFF4E50, 0xFC913A, 0xF9D423, 0xEDE574, 0xE1F5C4, 0xFFFFFF],
    [0xE94E77, 0xD68189, 0xC6A49A, 0xC6E5D9, 0xF4EAD5, 0xFFFFFF],
    [0xFFFFFF, 0xE8DDCB, 0xCDB380, 0x036564, 0x033649, 0x031634],
    [0x69D2E7, 0xA7DBD8, 0xE0E4CC, 0xFFFFFF, 0xF38630, 0xFA6900],
    [0x490A3D, 0xBD1550, 0xE97F02, 0xF8CA00, 0xFFFFFF, 0x8A9B0F],
    [0x8C2318, 0x5E8C6A, 0x88A65E, 0xBFB35A, 0xF2C45A, 0xFFFFFF],
    [0xFFFFFF, 0xEFFFCD, 0xDCE9BE, 0x555152, 0x2E2633, 0x99173C],
]

function toHex(d: number): string {
  let hex = Number(d).toString(16)
  hex = '000000'.substr(0, 6 - hex.length) + hex
  return '#'+hex
}

function store(key: string, value: any) {
    try {
        const data = JSON.stringify(value)
        window.localStorage.setItem(key, data)
    } catch (error) {
        console.warn(`unable to store ${ key }`, error)
    }
}

function retrieve(key: string): any {
    try {
        const string = window.localStorage.getItem(key)
        return JSON.parse(string)
    } catch (error) {
        console.warn(`unable to retrieve ${ key }`, error)
    }
}

const now = window.performance ? () => window.performance.now() : () => Date.now()
const day = () => Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 2))

const client = new Client('ws://192.168.1.33:4242', Painter, {
    sendTimeout: 5 * 60 * 1000,
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

    const colors = palettes[day() % palettes.length]

    let activeColor: number = colors[0]

    const colorWells: HTMLSpanElement[] = []
    const colorPicker = document.createElement('div')
    colorPicker.className = 'picker'
    for (const color of colors) {
        const well = document.createElement('span')
        const cssColor = toHex(color)
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

    const pixelRatio = window.devicePixelRatio || 1

    canvas.width = window.innerWidth * pixelRatio
    canvas.height = window.innerHeight * pixelRatio

    let offset: {x: number, y: number}// = retrieve('offset')
    if (!offset) {
        offset = {
            x: Math.max(0, (shared.canvasWidth / 2) - (canvas.width / 2)),
            y: Math.max(0, (shared.canvasHeight / 2) - (canvas.height / 2)),
        }
    }

    function offsetPaint(event: IPaintEvent) {
        const {pos, color, size} = event
        shared.paint({
            pos: {
                x: pos.x - offset.x,
                y: pos.y - offset.y,
            }, color, size
        }, ctx)
    }
    client.on('event paint', offsetPaint)


    const panHandle = document.createElement('div')
    panHandle.className = 'pan-handle'
    panHandle.innerHTML = '☩'
    document.body.appendChild(panHandle)

    const panInfo = document.createElement('div')
    panInfo.className = 'info pan'
    panInfo.innerHTML = 'Drag to move'
    document.body.appendChild(panInfo)

    let isPanning = false
    const enterPan = () => {
        isPanning = true
        document.documentElement.classList.add('pan')
        window.addEventListener('mousedown', startMousePan)
    }

    const exitPan = () => {
        isPanning = false
        document.documentElement.classList.remove('pan')
        window.removeEventListener('mousedown', startMousePan)
    }

    let panStartPos: {x: number, y: number}
    let panStartOffset: {x: number, y: number}
    let panData: ImageData

    const panStart = (pos: {x: number, y: number}) => {
        document.documentElement.classList.add('pan-move')
        panStartPos = {x: pos.x, y: pos.y}
        panStartOffset = {x: offset.x, y: offset.y}
        panData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    }

    const panMove = (pos: {x: number, y: number}) => {
        const dx = pos.x - panStartPos.x
        const dy = pos.y - panStartPos.y

        offset.x = panStartOffset.x - dx
        offset.y = panStartOffset.y - dy

        if (offset.x < 0 || offset.y < 0 ||
            offset.x > shared.canvasWidth - canvas.width ||
            offset.y > shared.canvasHeight - canvas.height)
        {
            ctx.fillStyle = '#ffd4c6'
        } else {
            ctx.fillStyle = '#e9e9e9'
        }

        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.putImageData(panData, dx, dy)
    }

    const panEnd = () => {
        offset.x = Math.max(0, Math.min(offset.x, shared.canvasWidth - canvas.width))
        offset.y = Math.max(0, Math.min(offset.y, shared.canvasHeight - canvas.height))
        if (offset.x !== panStartOffset.x || offset.y !== panStartOffset.y) {
            fetchCanvas()
        } else {
            ctx.putImageData(panData, 0, 0)
        }
        store('offset', offset)
        document.documentElement.classList.remove('pan-move')
        panData = null
    }

    const startMousePan = (event: MouseEvent) => {
        event.preventDefault()
        panStart(event)
        const moveHandler = (event: MouseEvent) => {
            // event.preventDefault()
            panMove(event)
        }
        const endHandler = (event: MouseEvent) => {
            event.preventDefault()
            window.removeEventListener('mousemove', moveHandler)
            window.removeEventListener('mouseup', endHandler)
            window.removeEventListener('mouseleave', endHandler)
            panEnd()
        }
        window.addEventListener('mousemove', moveHandler)
        window.addEventListener('mouseup', endHandler)
        window.addEventListener('mouseleave', endHandler)
    }

    window.addEventListener('keydown', (event) => {
        if (event.keyCode === 32) {
            event.preventDefault()
            if (!isPanning) { enterPan() }
        }
    })

    window.addEventListener('keyup', (event) => {
        if (event.keyCode === 32) {
            event.preventDefault()
            exitPan()
        }
    })

    panHandle.addEventListener('touchstart', (event) => {
        event.preventDefault()
        enterPan()
    })

    panHandle.addEventListener('touchcancel', (event) => {
        exitPan()
    })

    panHandle.addEventListener('touchend', (event) => {
        exitPan()
    })

    panHandle.addEventListener('mousedown', (event) => {
        event.preventDefault()
        startMousePan(event)
    })

    const loadingEl = document.createElement('div')
    loadingEl.className = 'info loading'
    loadingEl.innerHTML = 'Loading canvas...'
    document.body.appendChild(loadingEl)

    async function fetchCanvas() {
        document.documentElement.classList.add('loading')

        offset.x = Math.max(0, Math.min(offset.x, shared.canvasWidth - canvas.width))
        offset.y = Math.max(0, Math.min(offset.y, shared.canvasHeight - canvas.height))
        store('offset', offset)

        let encoding = CanvasRequest.Encoding.JPEG
        const request = {
            offset, encoding,
            width: Math.min(window.innerWidth * pixelRatio, shared.canvasWidth - offset.x),
            height: Math.min(window.innerHeight * pixelRatio, shared.canvasHeight - offset.y),
        }
        console.log('loading canvas...', request)
        const response = await client.service.getCanvas(request)

        console.log(`response size: ${ ~~(response.image.length / 1024) }kb`)

        const arr = response.image
        let buffer = Buffer.from(arr.buffer)
        buffer = buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength)

        await new Promise((resolve, reject) => {
            const img = new Image()
            let type: string
            switch (encoding) {
                case CanvasRequest.Encoding.JPEG:
                    type = 'image/jpeg'
                    break
                case CanvasRequest.Encoding.WEBP:
                    type = 'image/webp'
                    break
                case CanvasRequest.Encoding.PNG:
                    type = 'image/png'
                    break
                 default:
                     throw new Error('Invalid encoding')
            }
            img.src = `data:${ type };base64,` + buffer.toString('base64')
            img.onload = () => {
                ctx.globalAlpha = 1.0
                ctx.fillStyle = 'white'
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                ctx.drawImage(img, 0, 0)
                resolve()
            }
            img.onerror = (error) => {
                reject(error)
            }
        })

        document.documentElement.classList.remove('loading')
    }

    let debounceTimer
    window.addEventListener('resize', () => {
        if (window.innerWidth * pixelRatio <= canvas.width &&
            window.innerHeight * pixelRatio <= canvas.height) {
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
            canvas.width = window.innerWidth * pixelRatio
            canvas.height = window.innerHeight * pixelRatio
            ctx.putImageData(data, 0, 0)
        } else {
            canvas.width = window.innerWidth * pixelRatio
            canvas.height = window.innerHeight * pixelRatio
            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(fetchCanvas, 500)
            document.documentElement.classList.add('loading')
        }
    })

    await fetchCanvas()

    const vF = 0.5
    const vMax = 8
    async function drawAsync(event: DrawEvent) {
        let msgs: IPaintEvent[] = []
        let size = 20// * pixelRatio
        const color = event.color
        if (event.force) {
            size = Math.min(size + event.force * shared.brushSize, shared.brushSize)
        }
        if (event.lastPos) {
            const dx = event.lastPos.x - event.pos.x
            const dy = event.lastPos.y - event.pos.y
            const d = Math.sqrt(dx*dx + dy*dy)
            if (!event.force && event.pos.timestamp !== event.lastPos.timestamp) {
                const dt = event.pos.timestamp - event.lastPos.timestamp
                let v = Math.min(d / dt, vMax)
                if (event.lastV) {
                    v = event.lastV * (1 - vF) + v * vF
                }
                if (v < 0) { v = 0 }
                event.lastV = v
                size = Math.min(size + size * v, shared.brushSize)
            }
            const interpSteps = ~~(d / (size / 4))
            for (let i = 0; i < interpSteps; i++) {
                const p = (i + 1) / (interpSteps + 1)
                const x = event.lastPos.x * p + event.pos.x * (1 - p)
                const y = event.lastPos.y * p + event.pos.y * (1 - p)
                msgs.push({pos: {x: x + offset.x, y: y + offset.y}, color, size})
            }
        }
        msgs.push({
            pos: {
                x: event.pos.x + offset.x,
                y: event.pos.y + offset.y,
            },
            color, size
        })
        let drawCalls = []
        for (const msg of msgs) {
            offsetPaint(msg)
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
        event.preventDefault()
        if (isPanning) { return }
        mouseDraw = {
            pos: {
                x: event.x * pixelRatio,
                y: event.y * pixelRatio,
                timestamp: event.timeStamp || now(),
            },
            color: activeColor,
        }
        draw(mouseDraw)
    })

    canvas.addEventListener('mousemove', (event) => {
        event.preventDefault()
        if (isPanning) { return }
        if (mouseDraw) {
            mouseDraw.lastPos = mouseDraw.pos
            mouseDraw.pos = {
                x: event.x * pixelRatio,
                y: event.y * pixelRatio,
                timestamp: event.timeStamp || now(),
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
    let panTouch: number|undefined

    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault()
        if (isPanning) {
            if (!panTouch) {
                for (var i = 0; i < event.touches.length; i++) {
                    const touch = event.touches[i]
                    if (touch.target === panHandle) { continue }
                    panTouch = touch.identifier
                    console.log('tracking', panTouch)
                    panStart({x: touch.screenX, y: touch.screenY})
                    break
                }
            }
            return
        }
        for (var i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i]
            fingerDraw[touch.identifier] = {
                pos: {
                    x: touch.screenX * pixelRatio,
                    y: touch.screenY * pixelRatio,
                    timestamp: event.timeStamp || now(),
                },
                force: touch['force'],
                color: activeColor
            }
            draw(fingerDraw[touch.identifier])
        }
    })

    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault()
        if (isPanning) {
            if (panTouch) {
                for (var i = 0; i < event.touches.length; i++) {
                    const touch = event.touches[i]
                    if (touch.identifier == panTouch) {
                        panMove({x: touch.screenX, y: touch.screenY})
                        break
                    }
                }
            }
            return
        }
        for (var i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i]
            const drawEvent = fingerDraw[touch.identifier]
            if (drawEvent) {
                drawEvent.lastPos = drawEvent.pos
                drawEvent.pos = {
                    x: touch.screenX * pixelRatio,
                    y: touch.screenY * pixelRatio,
                    timestamp: event.timeStamp || now(),
                }
                drawEvent.force = touch['force']
                draw(drawEvent)
            }
        }
    })

    const touchend = (event: TouchEvent) => {
        event.preventDefault()
        if (isPanning) {
            if (panTouch) {
                panEnd()
                panTouch = undefined
            }
            return
        }
        for (var i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i]
            delete fingerDraw[touch.identifier]
        }
    }
    canvas.addEventListener('touchend', touchend)
    canvas.addEventListener('touchcancel', touchend)
})

console.log(' ;-) ')
window['client'] = client
