
import {Client} from 'wsrpc'
import {Painter, PaintMessage, StatusMessage} from './protocol'

const colors = [
    0xFCE5BC,
    0xFDCD92,
    0xFCAC96,
    0xDD8193,
]

function randomColor()  {
    return colors[Math.floor(colors.length * Math.random())]
}

const client = new Client('ws://localhost:4242', Painter, {
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
    document.body.appendChild(status)
    status.innerHTML = 'Connecting...'

    client.on('event status', (msg: StatusMessage) => {
        status.innerHTML = `Users: ${ msg.users }`
    })

    client.on('error', (error) => {
        console.warn('client error', error)
    })

    client.on('close', () => {
        status.innerHTML = 'Disconnected'
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

    const numColors = 24 + 1
    let color: number

    function paint(x: number, y: number) {
        client.service.paint({x, y, color})
    }

    client.on('event paint', (p: PaintMessage) => {
        ctx.beginPath()
        ctx.moveTo(p.x * ratio, p.y * ratio)
        ctx.ellipse(p.x * ratio, p.y * ratio, 5 * ratio, 5 * ratio, 0, 0, Math.PI*2)
        ctx.fillStyle = '#' + p.color.toString(16)
        ctx.closePath()
        ctx.fill()
    })

    let mouseDown = false
    canvas.addEventListener('mousedown', (event) => {
        mouseDown = true
        color = randomColor()
        paint(event.x, event.y)
    })

    canvas.addEventListener('mouseup', (event) => {
        mouseDown = false
    })

    canvas.addEventListener('mousemove', (event) => {
        if (mouseDown) {
            paint(event.x, event.y)
        }
    })
})

console.log(' ;-) ')
window['colors'] = colors
window['client'] = client
