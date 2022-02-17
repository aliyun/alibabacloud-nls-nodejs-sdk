/*
tts.js

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

class SpeechSynthesizer {
  constructor(config) {
    this._client = new NlsClient(config)
    this._event = new EventEmitter()
    this._config = config
  }

  defaultStartParams(voice) {
    return {
      voice: voice,
      format: "wav",
      sample_rate: 16000,
      volume: 50,
      speech_rate: 0,
      pitch_rate: 0,
      enable_subtitle: false
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
        namespace:"SpeechSynthesizer",
        name:"StartSynthesis",
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
              if (msgObj.header.name === "MetaInfo") {
                //console.log("emit metainfo")
                this._event.emit("meta", str)
              } else if (msgObj.header.name === "SynthesisCompleted") {
                //console.log("emit completed")
                this._client.clearPing()
                this._client.shutdown()
                this._client = null
                this._event.emit("completed", str)
                resolve(str)
              } else if (msgObj.header.name === "TaskFailed") {
                //console.log("emit taskfailed")
                this._client.clearPing()
                this._client.shutdown()
                this._client = null
                this._event.emit("TaskFailed", str)
                this._event.emit("failed", str)
                reject(str)
              }
            } else {
              this._event.emit("data", msg)
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

  shutdown() {
    if (this._client == null) {
      //console.log("client is null")
      return
    }

    this._client.shutdown()
  }
}

module.exports = SpeechSynthesizer
