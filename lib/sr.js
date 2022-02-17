/*
sr.js

Copyright 1999-present Alibaba Group Holding Ltd.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

"use strict"

const NlsClient = require("./nls")
const EventEmitter = require("events").EventEmitter

class SpeechRecognition {
  constructor(config) {
    this._client = new NlsClient(config)
    this._event = new EventEmitter()
    this._config = config
  }

  defaultStartParams() {
    return {
      format:"pcm",
      sample_rate:16000,
      enable_intermediate_result:true,
      enable_punctuation_predition:true,
      enable_inverse_text_normalization:true
    }
  }

  on(which, handler) {
    this._event.on(which, handler)
  }

  async start(param, enablePing, pingInterval) {
    this._taskid = this._client.uuid()
    let req = {
      header:{
        message_id:this._client.uuid(),
        task_id:this._taskid,
        namespace:"SpeechRecognizer",
        name:"StartRecognition",
        appkey:this._config.appkey
      },
      payload: param,
      context: this._client.defaultContext()
    }

    return new Promise(async (resolve, reject) => {
      try {
        await this._client.start(
          //onmessage
          (msg, isBinary) => {
            if (!isBinary) {
              let str = msg.toString()
              //console.log("recv ", str);
              let msgObj = JSON.parse(str)
              if (msgObj.header.name === "RecognitionStarted") {
                //console.log("emit onStart")
                this._event.emit("started", str)
                resolve(str)
              } else if (msgObj.header.name === "RecognitionResultChanged") {
                //console.log("emit resultChanged")
                this._event.emit("changed", str)
              } else if (msgObj.header.name === "RecognitionCompleted") {
                //console.log("emit completed")
                this._event.emit("RecognitionCompleted", str)
              } else if (msgObj.header.name === "TaskFailed") {
                //console.log("emit taskfailed")
                this._client.clearPing()
                this._client.shutdown()
                this._client = null

                this._event.emit("TaskFailed", str)
                this._event.emit("failed", str)
              }
            }
          },
          //onclose
          ()=> {
            //console.log("emit onClose")
            this._event.emit("closed")
          })
        if (enablePing) {
          if (!pingInterval) {
            pingInterval = 6000
          }
          this._client.setPing(pingInterval)
        }
        this._client.send(JSON.stringify(req), false)
      } catch (error) {
        reject(error)
      }
    })
  }

  async close(param) {
    if (this._client == null) {
      return new Promise((resolve, reject)=>{
        process.nextTick(()=>{
          reject("client is null")
        })
      })
    }

    let req = {
      header:{
        message_id:this._client.uuid(),
        task_id:this._taskid,
        namespace:"SpeechRecognizer",
        name:"StopRecognition",
        appkey:this._config.appkey
      },
      payload: param,
      context: this._client.defaultContext()
    }

    return new Promise((resolve, reject) => {
      this._event.on("RecognitionCompleted",
        (msg) => {
          if (this._client) {
            this._client.clearPing()
            this._client.shutdown()
            this._client = null
          }
          this._event.emit("completed", msg)
          resolve(msg)
        })

      this._event.on("TaskFailed",
        (msg) => {
          reject(msg)
        })

      this._client.send(JSON.stringify(req), false)
    })
  }

  shutdown() {
    if (this._client == null) {
      //console.log("client is null")
      return
    }

    this._client.shutdown()
  }

  sendAudio(data) {
    if (this._client == null) {
      //console.log("client is null")
      return false
    }

    this._client.send(data, true)
    return true
  }
}

module.exports = SpeechRecognition
