'use strict'
const crypto = require('crypto')
const fp = require('lodash/fp')

describe('API signature', function() {
  describe('Signature', function() {
    it('should generate API sign for {a: 1, b: 2}', function() {
      const env = {
        uid: 'root',
        md5pass: 'e10adc3949ba59abbe56e057f20f883e',
        v: 1450692138,
      }
      const pureReq = {'a': 1, 'b': 2}

      const payload = {...pureReq, p: env.uid, v: env.v}

      finalJson(env, payload).should.be.eql({
        'a': 1,
        'b': 2,
        'p': 'root',
        'sign': '9b678834c848d2195155f3f5dc928d746f9773c4',
        'v': 1450692138,
      })
    })

    it('should generate API sign for command', function() {
      const env = {
        uid: 'userA',
        md5pass: 'c33367701511b4f6020ec61ded352059',
        v: 1530272496,
      }
      const pureReq = {
        'command': 'EMC_SWITCH',
        'param': {'mode': 'EMC_OFF'},
        'cz': 3,
        'ca': '%%',
        'ctrlcode': '7C4A8D09CA3762AF61E59520943DC26494F8941B',
      }

      const payload = {...pureReq, p: env.uid, v: env.v}

      finalJson(env, payload).should.be.eql({
        'ca': '%%',
        'command': 'EMC_SWITCH',
        'ctrlcode': '7C4A8D09CA3762AF61E59520943DC26494F8941B',
        'cz': 3,
        'p': 'userA',
        'param': {
          'mode': 'EMC_OFF',
        },
        'sign': '69a67d0ce4bc98fb3d5bebdc40878003bc948cb0',
        'v': 1530272496,
      })
    })

    it('should generate sign for /api/sensor/info', function() {
      const env = {
        uid: 'EM30G560GH455GV',
        md5pass: 'cfbfbebcb307187bda5d9c021f76f175',
        v: 1530497071,
      }
      const pureReq = {
        'projectid': '577499e785ae16405764025f',
      }

      const payload = {...pureReq, p: env.uid, v: env.v}

      finalJson(env, payload).should.be.eql({
        'p': 'EM30G560GH455GV',
        'projectid': '577499e785ae16405764025f',
        'sign': 'dfda7e2089ca2e0359a160c60e9310de5c96ccaa',
        'v': 1530497071,
      })
    })
  })
  describe('ctrlcode', function() {
    it('should generate hash for ctrlcode', function() {
      Hash('000000').
        toUpperCase().
        should.
        be.
        eql('C984AED014AEC7623A54F0591DA07A85FD4B762D')
      Hash('111111').
        toUpperCase().
        should.
        be.
        eql('3D4F2BF07DC1BE38B20CD6E46949A1071F9D0E3D')
      Hash('123456').
        toUpperCase().
        should.
        be.
        eql('7C4A8D09CA3762AF61E59520943DC26494F8941B')
    })
  })
})

/**
 * @return {string}
 */
const MD5 = function(plain) {
  return crypto.createHash('md5').update(plain).digest('hex').toUpperCase()
}

const log = console

const finalJson = ({uid, md5pass, v}, data) => ({
  ...data,
  p: uid,
  v,
  sign: genSign(data, {uid, md5pass}),
})

const genSign = (data, {uid, password, md5pass}) => {
  if (fp.isEmpty(data)) {
    return null
  }

  const user = data.p
  const v = data.v
  if (!user || !v) {
    return null
  }

  const vCode = Hash(v)
  console.log('vCode', vCode)
  const encryptData = fp.omit(['p', 'sign', 't'])(data)

  //get user's token
  /**
   * @return {string}
   */
  const DecryptData = function(secret) {
    const userInfo = {user: uid, passwd: md5pass ? md5pass : MD5(password)}
    console.log('userInfo', userInfo)
    const plainToken = userInfo.user + userInfo.passwd + userInfo.user
    console.log('plainToken', plainToken)
    const token = MD5(plainToken)
    console.log('token', token)
    secret['t'] = token

    //验证
    secret['p'] = userInfo.user
    secret = fp.omit(['v'])(secret)
    let extPlainText = ExtPlainText(secret, vCode)
    console.log('extPlainText', extPlainText)

    let extSign = Hash(extPlainText)
    log.log('extSign', extSign)
    return extSign
  }

  return DecryptData(encryptData)
}

/**
 * @return {string}
 */
function Hash(v) {
  const hash = crypto.createHash('sha1')
  return hash.update(v.toString()).digest('hex')
}

/**
 * @return {string}
 */
function ExtPlainText(data, vCode) {
  const kvArray = fp.map(([key, value]) => {
    const v = fp.isObject(value) ? JSON.stringify(value) : value
    return key + '=' + encodeURIComponent(v)
  })(fp.toPairs(data)).sort()

  const coreText = kvArray.toString().replace(/,/g, '')
  return vCode + coreText + vCode
}
