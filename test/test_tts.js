"use strict"

require('log-timestamp')(`${process.pid}`)
const fs = require("fs")
const SpeechSynthesizer = require("../lib/tts")
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs))
const util = require("util")
const readline = require("readline")
const args = process.argv.slice(2)
//const Memwatch = require("node-memwatch-new")

const URL = "wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1"
const APPKEY = "Your Appkey"
const TOKEN = "Your Token"

let b1 = []
let reqTimes = 0
let successTimes = 0
let failReq = 0
let leakDetectTimes = 0
let loadIndex = 0
//let hd = new Memwatch.HeapDiff()
let needDump = true

async function runOnce(line) {
  console.log(`speak: ${line}`)
  loadIndex++
  reqTimes++
  process.send({cmd:"req"})

  //let dumpFile = fs.createWriteStream(`dump/${process.pid}.wav`, {flags:"w"})
  let tts = new SpeechSynthesizer({
    url: URL,
    appkey:APPKEY,
    token:TOKEN
  })

  tts.on("meta", (msg)=>{
    console.log("Client recv metainfo:", msg)
  })

  tts.on("data", (msg)=>{
    console.log(`recv size: ${msg.length}`)
    //console.log(dumpFile.write(msg, "binary"))
  })

  tts.on("completed", (msg)=>{
    console.log("Client recv completed:", msg)
  })

  tts.on("closed", () => {
    console.log("Client recv closed")
  })

  tts.on("failed", (msg)=>{
    console.log("Client recv failed:", msg)
  })

  let param = tts.defaultStartParams()
  param.text = line
  param.voice = "aixia"
  try {
    await tts.start(param, true, 6000)
    successTimes++
    process.send({cmd:"success"})
  } catch(error) {
    console.log("error on start:", error)
    process.send({cmd:"failed"})
    return
  } finally {
    //dumpFile.end()
  }
  console.log("synthesis done")
  await sleep(2000)
  console.log("wait done")
}

async function test() {
  console.log("load test case:", args[2])
  const fileStream = fs.createReadStream(args[2])
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  for await (const line of rl) {
    b1.push(line)
  }

  while (true) {
    for (let text of b1) {
      await runOnce(text)
    }
  }
}

process.on("SIGINT", () => {
  console.log(`Ready to exit reqTimes:${reqTimes} successTimes:${successTimes}`)
  process.exit()
})

test()
