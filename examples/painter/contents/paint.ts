
import {Client} from 'wsrpc'
import {Painter, PaintMessage, StatusMessage} from './protocol'

interface Position {
    x: number
    y: number
    timestamp: number
}

interface PaintEvent {
    pos: Position
    lastPos?: Position
    color: number
}

const colors = [
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

const client = new Client('ws://192.168.1.33:4242', Painter, {
    sendTimeout: 500,
    eventTypes: {
        paint: PaintMessage,
        status: StatusMessage,
    }
})

client.on('open', () => {
    document.documentElement.classList.add('connected')
})

client.on('close', () => {
    document.documentElement.classList.remove('connected')
})

window.addEventListener('DOMContentLoaded', () => {
    const status = document.createElement('div')
    status.className = 'status'
    status.innerHTML = 'Connecting...'
    document.body.appendChild(status)

    client.on('event status', (msg: StatusMessage) => {
        status.innerHTML = `Users: ${ msg.users }`
    })

    client.on('close', () => {
        status.innerHTML = 'Disconnected'
    })

    client.on('error', (error) => {
        console.warn('client error', error)
    })

    const canvas = document.querySelector('canvas')
    const ctx = canvas.getContext('2d')
    const ratio = window.devicePixelRatio || 1

    canvas.width = window.innerWidth  * ratio
    canvas.height = window.innerHeight * ratio

    window.addEventListener('resize', () => {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
        canvas.width = window.innerWidth * ratio
        canvas.height = window.innerHeight * ratio
        ctx.putImageData(data, 0, 0)
    })

    const vMax = 10
    function paint(event: PaintEvent) {
        let velocity = 0
        if (event.lastPos) {
            const dx = event.lastPos.x - event.pos.x
            const dy = event.lastPos.y - event.pos.y
            const dt = event.pos.timestamp - event.lastPos.timestamp
            velocity = Math.sqrt(dx*dx + dy*dy) / dt
        }
        client.service.paint({
            x: event.pos.x,
            y: event.pos.y,
            color: event.color,
            size: 2 + Math.min(velocity * 4, 8),
        })
        console.log(velocity)
    }

    client.on('event paint', (p: PaintMessage) => {
        ctx.beginPath()
        ctx.moveTo(p.x * ratio, p.y * ratio)
        ctx.ellipse(p.x * ratio, p.y * ratio, p.size * ratio, p.size * ratio, 0, 0, Math.PI*2)
        ctx.fillStyle = '#' + p.color.toString(16)
        ctx.closePath()
        ctx.fill()
    })

    let mousePaint: PaintEvent|undefined

    canvas.addEventListener('mousedown', (event) => {
        mousePaint = {
            pos: {
                x: event.x,
                y: event.y,
                timestamp: event.timeStamp || now(),
            },
            color: randomColor(),
        }
        paint(mousePaint)
        event.preventDefault()
    })

    canvas.addEventListener('mousemove', (event) => {
        if (mousePaint) {
            mousePaint.lastPos = mousePaint.pos
            mousePaint.pos = {
                x: event.x,
                y: event.y,
                timestamp: event.timeStamp || now(),
            }
            paint(mousePaint)
        }
    })

    const mouseup = (event) => {
        mousePaint = undefined
    }
    canvas.addEventListener('mouseup', mouseup)
    canvas.addEventListener('mouseleave', mouseup)

    let fingerPaint: {[id: number]: PaintEvent} = {}

    canvas.addEventListener('touchstart', (event) => {
        for (var i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i]
            fingerPaint[touch.identifier] = {
                pos: {
                    x: touch.screenX,
                    y: touch.screenY,
                    timestamp: event.timeStamp || now(),
                },
                color: randomColor()
            }
            paint(fingerPaint[touch.identifier])
        }
        event.preventDefault()
    })

    canvas.addEventListener('touchmove', (event) => {
        for (var i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i]
            const paintEvent = fingerPaint[touch.identifier]
            if (paintEvent) {
                paintEvent.lastPos = paintEvent.pos
                paintEvent.pos = {
                    x: touch.screenX,
                    y: touch.screenY,
                    timestamp: event.timeStamp || now(),
                }
                paint(paintEvent)
            }
        }
        event.preventDefault()
    })

    const touchend = (event: TouchEvent) => {
        for (var i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i]
            delete fingerPaint[touch.identifier]
        }
        event.preventDefault()
    }
    canvas.addEventListener('touchend', touchend)
    canvas.addEventListener('touchcancel', touchend)
})

console.log(' ;-) ')
window['colors'] = colors
window['client'] = client
