'use strict'

const {toURLQuery} = require('../../libs/amap')

describe('Amap', () => {
  it('should extract queries from input', () => {
    toURLQuery({a: 'b', c: 'd'}).should.be.equal('a=b&c=d')
  })
  it('should decode special characters', () => {
    toURLQuery({a: 'I have some space'}).should.be.equal('a=I%20have%20some%20space')
  })
  it('should be able to handle empty input', () => {
    toURLQuery('').should.be.equal('')
  })
})