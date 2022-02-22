# NLS Nodejs SDK说明

> 本文介绍如何使用阿里云智能语音服务提供的Nodejs SDK，包括SDK的安装方法及SDK代码示例。



## 前提条件

使用SDK前，请先阅读接口说明，详细请参见**接口说明**。

### 下载安装

> 说明
>
> * SDK支持nodev14以上版本
> * 请确认已经安装nodejs&npm环境，并完成基本配置

1. 下载SDK
> npm install alibabacloud-nls

2. 导入SDK

在代码中使用require或者import导入SDK
```js
const Nls = require('alibabacloud-nls')
//Nls内部含SpeechRecognition, SpeechTranscription, SpeechSynthesizer
//下面为使用import导入SDK
//import SpeechRecognition from "alibabacloud/nls"
//import SpeechTranscription from "alibabacloud/nls"
//import SpeechSynthesizer from "alibabacloud/nls"
```


## 语音合成

### Class: SpeechSynthesizer

> SpeechSynthesizer类用于进行语音合成

构造函数参数说明:

| 参数                           | 类型   | 参数说明              |
| ------------------------------ | ------ | --------------------- |
| config                         | object | 连接配置对象|

config object说明：

| 参数                           | 类型   | 参数说明              |
| ------------------------------ | ------ | --------------------- |
| url                         | string | 服务URL| 
| appkey| string|Appkey| 
| token | string| token，见开发指南-获取Token部分，SDK需要客户自行获取或缓存token|


### defaultStartParams(voice)

> 返回一个默认的推荐参数，其中voice为用户提供，采样率为16000，格式为wav，音量50，语速语调皆为0，不开启字幕。客户在拿到默认对象后可以根据自己需求，结合**接口说明**中的参数列表来添加和修改参数

参数说明：

| 参数                           | 类型   | 参数说明              |
| ------------------------------ | ------ | --------------------- |
| voice                         | string | 发音人| 

返回值：

object类型对象，字段如下：
```json
{
    "voice": voice, 
    "format": "wav",
    "sample_rate": 16000,
    "volume": 50,
    "speech_rate": 0,
    "pitch_rate": 0,
    "enable_subtitle": false
}
```


### on(which, handler)

> 设置事件回调

参数说明：

| 参数          | 类型                      | 参数说明                                              |
| ------------- | ------------------------- | ----------------------------------------------------- |
| which        | string         | 事件名称                                |
| handler       | function                | 回调函数                                     |

支持的回调事件如下：
| 事件名称  | 事件说明          | 回调函数参数个数 | 回调函数参数说明        |
|-----------|-------------------|------------------|:------------------------|
| meta   | 字幕回调     | 1                | sting类型，字幕信息      |
| data   | 合成音频回调 | 1                | buffer类型，合成音频数据 |
| completed | 语音合成完成     | 1                | string类型，完成信息     |
| closed    | 连接关闭          | 0                | 无                      |
| failed    | 错误              | 1                | string类型，错误信息     |

返回值：
无


### async start(param, enablePing, pingInterval)

> 根据param发起一次语音合成，param可以参考defaultStartParams方法的返回，待合成文本需要设置到param的text字段中，具体参数见**接口说明**

参数说明：

| 参数  | 类型                        | 参数说明          |
| ----- | --------------------------- | ----------------- |
| param | object | 语音合成参数    |
| enablePing | bool | 是否自动向云端发ping，默认false |
| pingInterval| number | 发ping间隔，默认6000，单位为毫秒|

返回值：
Promise对象，当completed事件发生后触发resolve，并携带合成完毕的相关信息；当任何错误发生后触发reject，并携带异常信息



### 语音合成代码示例：

```js
"use strict"

require('log-timestamp')(`${process.pid}`)
const fs = require("fs")
const Nls = require("alibabacloud-nls")
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs))
const util = require("util")
const readline = require("readline")
const args = process.argv.slice(2)
//const Memwatch = require("node-memwatch-new")

const URL = "wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1"
const APPKEY = "Your Appkey"
const TOKEN = "Your Token"

let b1 = []
let loadIndex = 0
//let hd = new Memwatch.HeapDiff()
let needDump = true

async function runOnce(line) {
  console.log(`speak: ${line}`)
  loadIndex++

  //let dumpFile = fs.createWriteStream(`${process.pid}.wav`, {flags:"w"})
  let tts = new Nls.SpeechSynthesizer({
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
  } catch(error) {
    console.log("error on start:", error)
    return
  } finally {
    //dumpFile.end()
  }
  console.log("synthesis done")
  await sleep(2000)
}

async function test() {
  console.log("load test case:", args[0])
  const fileStream = fs.createReadStream(args[0])
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

test()
```





