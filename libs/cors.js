'use strict';

const config = require('config');

exports.allowOrigin = () => config.ALLOW_ORIGIN || 'saas.51dianxiaoge.com'