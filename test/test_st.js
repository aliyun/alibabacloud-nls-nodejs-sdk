"use strict"

require('log-timestamp')(`${process.pid}`)
const fs = require("fs")
const SpeechTranscription = require("../lib/st")
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs))
const util = require("util")
//const Memwatch = require("node-memwatch-new")

const URL = "wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1"
const APPKEY = "Your Appkey"
const TOKEN = "Your Token"

let audioStream = fs.createReadStream("test/test1.pcm", {
  encoding: "binary",
  highWaterMark: 1024
})
let b1 = []
let reqTimes = 0
let successTimes = 0
let leakDetectTimes = 0
//let hd = new Memwatch.HeapDiff()

audioStream.on("data", (chunk) => {
  let b = Buffer.from(chunk, "binary")
  b1.push(b)
})

audioStream.on("close", async ()=>{
  while (true) {
    reqTimes++
    process.send({cmd:"req"})
    /*
    leakDetectTimes++
    if (leakDetectTimes >= 10) {
      leakDetectTimes = 0
      let diff = hd.end()
      console.log("dump heap diff:")
      console.log(diff)
      hd = new Memwatch.HeapDiff()
    }
    */
    let st = new SpeechTranscription({
      url: URL,
      appkey:APPKEY,
      token:TOKEN
    })

    st.on("started", (msg)=>{
      console.log("Client recv started:", msg)
    })

    st.on("changed", (msg)=>{
      console.log("Client recv changed:", msg)
    })

    st.on("completed", (msg)=>{
      console.log("Client recv completed:", msg)
    })

    st.on("begin", (msg)=>{
      console.log("Client recv sentenceBegin:", msg)
    })

    st.on("end", (msg)=>{
      console.log("Client recv sentenceEnd:", msg)
    })

    st.on("closed", () => {
      console.log("Client recv closed")
    })

    st.on("failed", (msg)=>{
      console.log("Client recv failed:", msg)
    })

    try {
      await st.start(st.defaultStartParams(), true, 6000)
    } catch(error) {
      console.log("error on start:", error)
      process.send({cmd:"failed"})
      continue
    }

    try {
      for (let b of b1) {
        if (!st.sendAudio(b)) {
          throw new Error("send audio failed")
        }
        await sleep(20)
      }
    } catch(error) {
      console.log("sendAudio failed:", error)
      process.send({cmd:"failed"})
      continue
    }

    try {
      console.log("close...")
      await st.close()
      successTimes++
      process.send({cmd:"success"})
    } catch(error) {
      console.log("error on close:", error)
      process.send({cmd:"failed"})
    }
    await sleep(2000)
  }
})

process.on("SIGINT", () => {
  console.log(`Ready to exit reqTimes:${reqTimes} successTimes:${successTimes}`)
  process.exit()
})


