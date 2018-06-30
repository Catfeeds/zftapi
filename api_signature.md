# 智慧云能源智能仪表接口

    本接口提供给第三方智慧云能源智能仪表远程抄读，状态获取，远程控制功能

## 改动历史
日期 | 版本号 | 描述
:----:|----|:---:
2017/06/20|v1.0|创建文档
2017/07/14|v.1.1|加入devicedata接口
2017/12/04|v1.2|加入仪表刻度同步
2017/12/08|v1.3|更新签名细节
## 名词定义

	管理器(collector)：管理器连接一定数量的设备，并对设备的数据进行采集上传
	设备通道(channel)：一个传感器会拥有不止一个通道
	设备(device): 当前环境下,传感器和采集器在平台中统称为设备
	设备ID(did): 设备拥有的平台唯一ID
	通道ID(cid): 用于标识一个通道的ID

## 请求地址：
环境	|HTTPS请求地址
:----:|:----:
正式环境|https://api.cloudenergy.me/
测试环境| 对接测试时接口人员提供

#### <b>获取仪表刻度用量 /api/business/devicedata</b>
参数 | 类型 | 必填 | 最大长度 | 描述 | 示例值
:----:|----|:---:|:--------:|:---|:----:
did|string|是|32|设备id|
time|string|是|10|时间|
#### 说明

    当time为20170404时,返回为当天刻度和用量
    当time为2017040423时,返回为当天23点的刻度和用量
#### 返回参数
    {
      "cid": 通道id,
      "usage": 用量,
      "scale": 刻度
    }

#### <b>仪表控制 /api/control/send</b>
参数 | 类型 | 必填 | 最大长度 | 描述 | 示例值
:----:|----|:---:|:--------:|:---|:----:
id|string|是|32|设备id|
uid|string|是|64|用户id|
command|string|是|32|控制命令|
param|object|否|-|命令参数|
project|string|是|64|项目ID|
ctrlcode|string|是|64|控制密码|

#### 说明
电表开关用以下命令

    command: 'EMC_SWITCH'
    param:{'mode': 'EMC_ON'/'EMC_OFF'}

#### <b>仪表获取 /api/sensor/info</b>
参数 | 类型 | 必填 | 最大长度 | 描述 | 示例值
:----:|----|:---:|:--------:|:---|:----:
did|string|否|32|设备id|
collectorid|string|否|12|管理器id|
projectid|string|是|64|项目ID|

#### 返回参数

    {
      "paging": {
          "count": 总数,
          "pageindex": 当前页数,
          "pagesize": 分页大小
    },
    "detail": {
      "设备ID": {
        "did": 设备ID,
        "title": 设备名称,
        "tag": 设备编码,
        "status": {  设备状态
          "switch": "EMC_ON"
        },
        "comi": 倍率,
        "freq": 频率,
        "devicetype": 设备类型,
        "channels": [  //设备通道
          {
            "name": 通道名,
            "funcid": 通道id,
            "lasttotal": 最后刻度,
            "lastupdate": 最后更新时间
          }
        ]
      },
    }

### <b>数据管理器 /api/collector/info</b>
参数 | 类型 | 必填 | 最大长度 | 描述 | 示例值
:----:|----|:---:|:--------:|:---|:----:
id|string|否|32|管理器id|
projectid|string|是|64|项目ID|

##### 返回参数

    [{
      "_id": 管理器,
      "project": 项目ID,
      "title": 管理器名称,
      "lastupdate": 最后通讯时间,
      "isconnect": 是否在线
    }...]

### <b>仪表刻度读取 /api/control/syncscale</b>
参数 | 类型 | 必填 | 最大长度 | 描述 | 示例值
:----:|----|:---:|:--------:|:---|:----:
did|string|是|32|设备id|
projectid|string|是|64|项目ID|

##### 返回参数

    {
      "did": 设备ID,
      "lasttotal": 仪表刻度,
    }
#### 备注
刻度读取超时时间为5s

## 签名算法

### 要点

    取当前时间: 北京时间 2015/12/21 18:02:18 unixtimestamp: 1450692138
    当值为JSON对象时，需要字符串化
    每个值都需要URIEncode
    签名最后需要sha1后16进制大写

### 例子1：(文档中的例子)

#### 基础数据：

  - 登录用户uid: `root`
  - 明文password: `123456`
  - MD5加密后的 password `E10ADC3949BA59ABBE56E057F20F883E`
  - 当前时间: `1450692138`

  需要发送的请求是
  ```json
  { "a": 1, "b": 2 }
  ```


  - 步骤：
  1. p = `root`
  2. v = `1450692138` unixtimestamp
  3. vCode = SHA1(v)   vCode=`79cf5219e705aca5c37fcdefb648aaf525bb7dac`
  4. token = 校验token: MD5(uid+passwd+uid).toUpperCase（转大写）
   token=`ECA37F6242B57F208D6EE47753D44972`

  5.
  ```json
  {"p": "root", "v": 1450692138, "a": 1, "b": 2, "t": "ECA37F6242B57F208D6EE47753D44972"}
  ```

  plainText = vCode+'a=1b=2p=roott=ECA37F6242B57F208D6EE47753D44972'+vCode

  plainText =
  `79cf5219e705aca5c37fcdefb648aaf525bb7daca=1b=2p=roott=ECA37F6242B57F208D6EE47753D4497279cf5219e705aca5c37fcdefb648aaf525bb7dac`

  6. sign=SHA1(plainText).hex
      sign= 015c6c5095206f6de75dc6fc488a34fc41d53473

  7.最终请求：
  ```json
  {
    "p": "root",
    "a": 1,
    "b": 2,
    "sign": "015c6c5095206f6de75dc6fc488a34fc41d53473",
    "v": 1450692138
  }
  ```



  ### 例子2 ：

  #### 基础数据：
  - uid = `userA`
  - 明文password = `654321`
  - MD5加密后的password = `C33367701511B4F6020EC61DED352059`

  - 原始请求：
  ```json
  {
    "command": "EMC_SWITCH",
    "param": {
      "mode": "EMC_OFF"
    },
    "cz": 3,
    "ca": "%%"
  }
  ```
  - 步骤：
  1. p = `userA`
  2. v = `1530272496`
  3. vCode = `2983c70209011de8bb608b381d2b5283fe2e0212`
  4. token = `17105581A654C044A0BA28CD02980E5C`
  5. plainText = `2983c70209011de8bb608b381d2b5283fe2e0212ca=%25%25command=EMC_SWITCHcz=3p=userAparam=%7B%22mode%22%3A%22EMC_OFF%22%7Dt=17105581A654C044A0BA28CD02980E5C2983c70209011de8bb608b381d2b5283fe2e0212`
  6. sign = `553000bb275ea2f494a5c5b8da303bd6f327d71c`
  7. 最终请求：

  ```json
  {
    "command": "EMC_SWITCH",
    "param": {
      "mode": "EMC_OFF"
    },
    "cz": 3,
    "ca": "%%",
    "p": "userA",
    "v": 1530272496,
    "sign": "553000bb275ea2f494a5c5b8da303bd6f327d71c"
  }
  ```
