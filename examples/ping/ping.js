#!/usr/bin/env node

// usage: [address] [-s packetsize] [-i wait] [-W waittime]

const wsrpc = require('wsrpc')
const protobuf = require('protobufjs')
const crypto = require('crypto')
const assert = require('assert')

const proto = protobuf.loadSync('service.proto')
const argv = process.argv

const address = (argv[2] && argv[2].match(/^ws(s)?:\/\//i)) ? argv[2] : 'ws://localhost:4242'
const payloadSize = argv.indexOf('-s')>0 ? Number(argv[argv.indexOf('-s')+1]) : 1024
const sendTimeout = argv.indexOf('-W')>0 ? Number(argv[argv.indexOf('-W')+1]) : 1000
const pingInterval = argv.indexOf('-i')>0 ? Number(argv[argv.indexOf('-i')+1]) : 1000

const client = new wsrpc.Client(address, proto.lookupService('PingService'), {sendTimeout})
client.on('error', (error) => {})

async function ping(size) {
    const nonce = crypto.randomBytes(size)
    const start = process.hrtime()
    const response = await client.service.ping({nonce})
    const diff = process.hrtime(start)
    assert.deepEqual(nonce, response.nonce, 'nonce should be the same')
    return diff[0] * 1e4 + (diff[1] / 1e6)
}

async function sleep(duration) {
    await new Promise((resolve) => setTimeout(resolve, duration))
}

let seq = 0
let transmitted = 0
let times = []

async function main() {
    console.log(`ping ${ address } with a payload size of ${ payloadSize } bytes`)
    let lastPrint = Date.now()
    while (true) {
        try {
            transmitted++
            const time = await ping(payloadSize)
            times.push(time)
            console.log(`seq=${ seq } time=${ time.toFixed(3) } ms`)
        } catch (error) {
            if (error.name !== 'TimeoutError') {
                throw error
            }
            console.log(`Timeout for seq ${ seq }`)
        }
        seq++
        await sleep(pingInterval)
    }
}

process.on('exit', () => {
    const n = times.length
    const loss = 1 - (n / transmitted)
    console.log(`\n--- ${ address } ping statistics ---`)
    console.log(`${ transmitted } transmitted, ${ n } received, ${ (loss*100).toFixed(1) }% loss`)
    if (n < 1) return
    const avg = times.reduce((v,n)=>v+n,0)/n
    const stddev = Math.sqrt(times.map((v)=>Math.pow(v-avg, 2)).reduce((v,n)=>v+n,0)/n)
    const min = Math.min.apply(null, times)
    const max = Math.max.apply(null, times)
    console.log(`round-trip min/avg/max/stddev = ${ [min,avg,max,stddev].map((v)=>v.toFixed(2)).join('/') } ms`)
})
process.on('SIGINT', () => process.exit())

main().catch((error) => {
    console.error('fatal error', error)
    process.exit(1)
})
