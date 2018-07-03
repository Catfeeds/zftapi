# 智慧云能源智能仪表接口

    本接口提供给第三方智慧云能源智能仪表远程抄读，状态获取，远程控制功能

## 改动历史
日期 | 版本号 | 描述
:----:|----|:---:
2017/06/20|v1.0|创建文档
2017/07/14|v.1.1|加入devicedata接口
2017/12/04|v1.2|加入仪表刻度同步
2017/12/08|v1.3|更新签名细节
2018/06/29|v1.4|增加签名实例
2018/07/02|v1.5|去掉签名实例中无意义的明文密码
2018/07/03|v1.6|增加Content-Type, key排序说明
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

**所有请求`Content-Type`为`application/json`, 确保http请求header里面设置正确。**

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
    ctrlcode: 需要sha1后16进制大写。
    假设控制码为'000000', 则ctrlcode: 'C984AED014AEC7623A54F0591DA07A85FD4B762D'
    假设控制码为'111111', 则ctrlcode: '3D4F2BF07DC1BE38B20CD6E46949A1071F9D0E3D'

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

	首先准备好：
    - 登录用户uid
	  - 密码密文passwd
	  - 当前时间戳: `1450692138` 表示 北京时间 2015/12/21 18:02:18 的 unixtimestamp
	  - 需要发送的请求

	token算法: MD5(uid+passwd+uid).toUpperCase（转大写）
  设备控制码ctrlcode有专门的加密要求：SHA1加密取十六进制(hex)码大写， 参考例子2
	当请求中字段值为JSON对象时，需要字符串化
    - 参考：`https://www.w3schools.com/js/js_json_stringify.asp`         
	每个字段值都需要URIEncode
    - 参考：`https://en.wikipedia.org/wiki/Query_string#URL_encoding`


### 例子1：

**基础数据**：
  - 登录用户uid: `root`
  - 密码密文passwd: `e10adc3949ba59abbe56e057f20f883e` 无需改变大小写，直接拼接token用
  - 当前时间戳: `1450692138`

  - 需要发送的请求是

    ```json
    {
      "a": 1,
      "b": 2
    }
    ```


**加密步骤**：
  1. p = `root`
  2. v = `1450692138` unixtimestamp
  3. vCode = SHA1(v)   vCode=`79cf5219e705aca5c37fcdefb648aaf525bb7dac`
  4. token = MD5(uid+passwd+uid).toUpperCase()
    计算结果token=`6C849A846FF2287F2506E30059A45F3D`

  5. 当前JSON为：

    ```json
    {
      "a": 1,
      "b": 2,
      "p": "root",
      "t": "6C849A846FF2287F2506E30059A45F3D"
    }
    ```

  plainText = vCode + "a=1b=2p=roott=ECA37F6242B57F208D6EE47753D44972" + vCode
  `plainText`中所有字段需要按照key的字母顺序进行排序，因此本次plainText中字段顺序为`a,b,p,t`
  注意`plainText`中不包括时间戳`v`

  计算结果plainText =
  `79cf5219e705aca5c37fcdefb648aaf525bb7daca=1b=2p=roott=6C849A846FF2287F2506E30059A45F3D79cf5219e705aca5c37fcdefb648aaf525bb7dac`

  6. sign=SHA1(plainText).hex
    计算结果sign=`9b678834c848d2195155f3f5dc928d746f9773c4`


  7. 最终请求：(包括`p`, `v`, `sign`, 不包含字段`t`)

    ```json
    {      
      "a": 1,
      "b": 2,
      "p": "root",
      "sign": "9b678834c848d2195155f3f5dc928d746f9773c4",
      "v": 1450692138
    }
    ```



### 例子2 ：

**基础数据**：
  - 登录用户uid = `userA`
  - 密码密文passwd: `c33367701511b4f6020ec61ded352059`
  - 当前时间戳 `1530272496`
  - 控制码ctrlcode明文是 `123456`, SHA1加密取十六进制(hex)码大写为：`7C4A8D09CA3762AF61E59520943DC26494F8941B`

  - 原始请求：

    ```json
    {
      "command": "EMC_SWITCH",
      "param": {
        "mode": "EMC_OFF"
      },
      "ctrlcode": "7C4A8D09CA3762AF61E59520943DC26494F8941B",
      "cz": 3,
      "ca": "%%"
    }
    ```

**加密步骤**：
  1. p = `userA`
  2. v = `1530272496`
  3. vCode = `2983c70209011de8bb608b381d2b5283fe2e0212`
  4. token = `D4AB3F48C42A65DF8F425AB55B501FF8`
  5. 当前JSON为：

     ```json
     {
       "command": "EMC_SWITCH",
       "param": {
         "mode": "EMC_OFF"
       },
       "ctrlcode": "7C4A8D09CA3762AF61E59520943DC26494F8941B",
       "cz": 3,
       "ca": "%%",
       "p": "userA",
       "t": "D4AB3F48C42A65DF8F425AB55B501FF8"
     }
     ```

     plainText = `2983c70209011de8bb608b381d2b5283fe2e0212ca=%25%25command=EMC_SWITCHctrlcode=7C4A8D09CA3762AF61E59520943DC26494F8941Bcz=3p=userAparam=%7B%22mode%22%3A%22EMC_OFF%22%7Dt=D4AB3F48C42A65DF8F425AB55B501FF82983c70209011de8bb608b381d2b5283fe2e0212`
     `plainText`中所有字段需要按照key的字母顺序进行排序，因此本次plainText中字段顺序为`ca,command,ctrlcode,cz,p,param,t`
     注意`plainText`中不包括时间戳`v`

  6. sign = `69a67d0ce4bc98fb3d5bebdc40878003bc948cb0`

  7. 最终请求：(包括`p`, `v`, `sign`, 不包含字段`t`)

    ```json
    {
      "command": "EMC_SWITCH",
      "param": {
        "mode": "EMC_OFF"
      },
      "ctrlcode": "7C4A8D09CA3762AF61E59520943DC26494F8941B",
      "cz": 3,
      "ca": "%%",
      "p": "userA",
      "v": 1530272496,
      "sign": "69a67d0ce4bc98fb3d5bebdc40878003bc948cb0"
    }
    ```
