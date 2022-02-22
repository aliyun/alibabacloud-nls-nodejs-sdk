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
//import SpeechRecognition from "alibabacloud-nls"
//import SpeechTranscription from "alibabacloud-nls"
//import SpeechSynthesizer from "alibabacloud-nls"
```


## 实时语音识别

### Class: SpeechTranscription

> SpeechTranscription类用于进行实时语音识别

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


### defaultStartParams()

> 返回一个默认的推荐参数，其中format为pcm，采样率为16000，中间结果，标点预测和ITN全开，客户在拿到默认对象后可以根据自己需求，结合**接口说明**中的参数列表来添加和修改参数

参数说明：

无

返回值：

object类型对象，字段如下：
```json
{
    "format": "pcm",
    "sample_rate": 16000,
    "enable_intermediate_result": true,
    "enable_punctuation_predition": true,
    "enable_inverse_text_normalization": true
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
| started   | 实时识别开始     | 1                | sting类型，开始信息      |
| changed   | 实时识别中间结果 | 1                | string类型，中间结果信息 |
| completed | 实时识别完成     | 1                | string类型，完成信息     |
| closed    | 连接关闭          | 0                | 无                      |
| failed    | 错误              | 1                | string类型，错误信息 |
 | begin | 提示句子开始 | 1 | string类型，相关信息| 
 | end | 提示句子结束|1|string类型，相关信息|
 


返回值：
无


### async start(param, enablePing, pingInterval)

> 根据param发起一次实时识别，param可以参考defaultStartParams方法的返回，具体参数见**接口说明**

参数说明：

| 参数  | 类型                        | 参数说明          |
| ----- | --------------------------- | ----------------- |
| param | object | 实时识别参数    |
| enablePing | bool | 是否自动向云端发ping，默认false |
| pingInterval| number | 发ping间隔，默认6000，单位为毫秒|

返回值：
Promise对象，当started事件发生后触发resolve，并携带started信息；当任何错误发生后触发reject，并携带异常信息


### async close(param)

> 停止实时识别

参数说明：
| 参数  | 类型                        | 参数说明          |
| ----- | --------------------------- | ----------------- |
| param | object | 实时识别结束参数    |


返回值：

Promise对象，当completed事件发生后触发resolve，并携带completed信息；当任何错误发生后触发reject，并携带异常信息



### shutdown()

> 强制断开连接

参数说明：

无

返回值：

无



### sendAudio(data)

> 发送音频，音频格式必须和参数中一致

参数说明

| 参数 | 类型   | 参数说明 |
| ---- | ------ | -------- |
| data | Buffer | 二进制音频数据 |

返回值：

无


### 实时识别代码示例：

```js
"use strict"

const Nls = require("alibabacloud-nls")
const fs = require("fs")
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs))

const URL = "wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1"
const APPKEY = "Your Appkey"
const TOKEN = "Your Token"

let audioStream = fs.createReadStream("test1.pcm", {
  encoding: "binary",
  highWaterMark: 1024
})
let b1 = []

audioStream.on("data", (chunk) => {
  let b = Buffer.from(chunk, "binary")
  b1.push(b)
})

audioStream.on("close", async ()=>{
  while (true) {
    let st = new Nls.SpeechTranscription({
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

    st.on("closed", () => {
      console.log("Client recv closed")
    })

    st.on("failed", (msg)=>{
      console.log("Client recv failed:", msg)
    })

    st.on("begin", (msg)=>{
      console.log("Client recv begin:", msg)
    })
    
    st.on("end", (msg)=>{
      console.log("Client recv end:", msg)
    })

    try {
      await st.start(st.defaultStartParams(), true, 6000)
    } catch(error) {
      console.log("error on start:", error)
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
      continue
    }

    try {
      console.log("close...")
      await st.close()
    } catch(error) {
      console.log("error on close:", error)
    }
    await sleep(2000)
  }
})

```





