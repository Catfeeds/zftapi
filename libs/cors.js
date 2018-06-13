'use strict';

const fp = require('lodash/fp');
const {URL} = require('url');

const frontendOrigin = 'https://saas.51dianxiaoge.com'
exports.allowOrigin = (domains = frontendOrigin) => (req) => {
  const host = fp.getOr(frontendOrigin)('headers.host')(req);
  const origin = new URL(`https://${host}` || frontendOrigin).origin;
  const allDomains = fp.split(',')(domains);
  return fp.includes(origin)(allDomains) ? origin : fp.head(allDomains);
};