"use strict"

var cluster = require("cluster")
var numCPUs = require("os").cpus().length
const args = process.argv.slice(2)
var workerNum = parseInt(args[1])
var runTarget = args[0]
const rimraf = require("rimraf")
const fs = require("fs")

if (cluster.isMaster) {
  console.log("cpu: ", numCPUs)
  console.log("worker: ", workerNum * numCPUs)
  console.log("target: ", runTarget)
  workerNum = workerNum * numCPUs
  if (workerNum == 0) {
    workerNum = 1
  } else if (workerNum > 500) {
    console.log("DO NOT RUN WORKER NUM MORE THAN 500!")
    process.exit()
  }

  let reqTotal = 0
  let successTotal = 0
  let failedTotal = 0
  function messageHandler(msg) {
    if (!msg.cmd) {
      return
    }
    if (msg.cmd === "req") {
      reqTotal++
    } else if (msg.cmd === "success") {
      successTotal++
    } else if (msg.cmd === "failed") {
      failedTotal++
    }
  }

  process.on("SIGINT", () => {
    let incompleteTotal = reqTotal - successTotal - failedTotal
    if (incompleteTotal < 0) {
      incompleteTotal = 0
    }
    console.log(`[master ready to exit]: success:${successTotal} failed:${failedTotal} total:${reqTotal} incomplete:${incompleteTotal}`)
    process.exit()
  })

  rimraf("dump", function(err) {
    fs.mkdir("dump", function(err) {
      rimraf("logs", function(err) {
        fs.mkdir("logs", function(err){
          if (err) {
            console.log("mkdir logs failed:", err)
            process.exit()
          } else {
            for (let i = 0; i < workerNum; i++) {
              cluster.fork()
            }

            for (const id in cluster.workers) {
              cluster.workers[id].on("message", messageHandler)
            }
          }
        })
      })
    })
  })
} else {
  let log_file = fs.createWriteStream(`logs/${process.pid}.access.log`, {flags:"w"})
  let err_file = fs.createWriteStream(`logs/${process.pid}.error.log`, {flags:"w"})
  process.stdout.write = log_file.write.bind(log_file)
  process.stderr.write = err_file.write.bind(err_file)
  console.log(`worker ${process.pid} started`)
  require(runTarget)
}
