'use strict';

const {
  allowOrigin,
} = require('../../libs/cors');

describe('CORS', () => {
  it('should allow origin if they are included in config', () => {
    allowOrigin('http://abc.com,http://cde.com')(
      {headers: {referer: 'http://cde.com'}}).
      should.
      be.
      equal('http://cde.com');
  });

  it('should allow the first origin if they are not included in config', () => {
    allowOrigin('http://abc.com,http://cde.com')(
      {headers: {referer: 'http://nonexists.com'}}).
      should.
      be.
      equal('http://abc.com');
  });

  it('should allow prod front end url as default', () => {
    allowOrigin()({headers: {referer: 'http://nonexists.com'}}).
      should.
      be.
      equal('https://saas.51dianxiaoge.com');
  });
});