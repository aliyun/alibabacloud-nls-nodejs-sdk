/*
nls.js

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

const Websocket = require("ws")
const assert = require("assert")
const {
  v1: uuidv1,
  v4: uuidv4,
} = require("uuid")



class NlsClient {
  constructor(config) {
    assert(config, 'must pass "config"')
    assert(config.url, 'must pass "url"')
    assert(config.appkey, 'must pass "appkey"')
    assert(config.token, 'must first get token from cache or getToken interface')
    this._config = config
  }

  start(onmessage, onclose) {
    if (typeof onmessage !== 'function') {
      throw new Error("expect function onmessage")
    }
    if (typeof onclose != 'function') {
      throw new Error("expect function onclose")
    }
    this._ws = new Websocket(this._config.url,
      {headers:{"X-NLS-Token": this._config.token},
        perMessageDeflate:false})
    this._ws.on("message", (data, isBinary) => {
      onmessage(data, isBinary)
    })
    this._ws.on("close", ()=>{
      onclose()
    })
    return new Promise((resolve, reject) => {
      this._ws.on("open", ()=>{
        //console.log("ws open")
        resolve()
      })
      this._ws.on("error", err=>{
        //console.log("ws error:", err)
        reject(err)
      })
    })
  }

  send(data, isBinary) {
    if (this._ws == null) {
      return
    }
    //if (!isBinary) {
    //  console.log("send:", data)
    //}
    this._ws.send(data, { binary:isBinary })
  }

  setPing(interval, callback) {
    this._ping = setInterval(()=>{
      //console.log("send ping")
      this._ws.ping(callback)
    }, interval)
  }


  clearPing() {
    if (this._ping) {
      clearInterval(this._ping)
    }
  }

  shutdown() {
    if (this._ws == null) {
      //console.log("ws is null")
      return
    }
    if (this._ping != null) {
      clearInterval(this._ping)
    }
    this._ws.terminate()
  }

  uuid() {
    return uuidv4().split("-").join("")
  }

  defaultContext() {
    return {
      sdk:{
        name: "nls-nodejs-sdk",
        version: "0.0.1",
        language: "nodejs"
      }
    }
  }

}

module.exports = NlsClient
