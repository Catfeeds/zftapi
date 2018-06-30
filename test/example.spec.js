'use strict'
const crypto = require('crypto')
const fp = require('lodash/fp')

describe('first test', function() {
  it('should allow promise testing', function() {
    return Promise.resolve(1).should.eventually.equal(1)
  })

  it('should generate API sign for {a: 1, b: 2}', function() {
    const env = {uid: 'root', password: '123456', v: 1450692138}
    const payload = {'a': 1, 'b': 2}

    check({...payload, p: env.uid, v: env.v}, env).
      should.
      be.
      eql('015c6c5095206f6de75dc6fc488a34fc41d53473')

  })

  it('should generate API sign for command', function() {
    const env = {uid: 'userA', password: '654321', v: 1530272496}
    const payload = {
      'command': 'EMC_SWITCH',
      'param': {'mode': 'EMC_OFF'},
      'cz': 3,
      'ca': '%%',
      'ctrlcode': '7C4A8D09CA3762AF61E59520943DC26494F8941B',
    }

    check({...payload, p: env.uid, v: env.v}, env).
      should.
      be.
      eql('b1790b66d7af3847d26acd16b89fe8b9f1820230')
  })

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

/**
 * @return {string}
 */
const MD5 = function(plain) {
  return crypto.createHash('md5').update(plain).digest('hex').toUpperCase()
}

const log = console

const check = (data, {uid, password}) => {
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
    const userInfo = {user: uid, passwd: MD5(password)}
    console.log('userInfo', userInfo)
    const plainToken = userInfo.user + userInfo.passwd + userInfo.user
    const token = MD5(plainToken)
    console.log('token', token)
    secret['t'] = token

    //验证
    secret['p'] = userInfo.user
    secret = fp.omit(['v'])(secret)
    let extPlainText = ExtPlainText(secret, vCode)
    // log.debug(plainText);

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
