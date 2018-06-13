'use strict';

const fp = require('lodash/fp');
const {URL} = require('url');

exports.allowOrigin = (domains = 'https://saas.51dianxiaoge.com') => ({headers}) => {
  const {referer} = headers;
  const origin = new URL(referer).origin;
  const allDomains = fp.split(',')(domains);
  return fp.includes(origin)(allDomains) ? origin : fp.head(allDomains);
};