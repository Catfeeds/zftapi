'use strict'

const {
  allowOrigin,
} = require('../../libs/cors')

describe('CORS', () => {
  it('should allow origin if they are included in config', () => {
    allowOrigin('https://abc.com,https://cde.com')(
      {headers: {origin: 'cde.com'}}).
      should.
      be.
      equal('https://cde.com')
  })

  it('should allow the first origin if they are not included in config', () => {
    allowOrigin('https://abc.com,https://cde.com')(
      {headers: {origin: 'nonexists.com'}}).
      should.
      be.
      equal('https://abc.com')
  })

  it('should allow prod front end url as default', () => {
    allowOrigin()({headers: {origin: 'nonexists.com'}}).
      should.
      be.
      equal('https://saas.51dianxiaoge.com')
  })

  it('should allow the first domain configured if no host in headers', () => {
    allowOrigin('https://abc.com,https://cde.com')().
      should.
      be.
      equal('https://abc.com')
  })
})
