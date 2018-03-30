'use strict';
const fp = require('lodash/fp');
const config = require('config');
const ALY = require('aliyun-sdk');

module.exports = new ALY.PUSH({
        accessKeyId: fp.get('ALICLOUD.key')(config),
        secretAccessKey: fp.get('ALICLOUD.secret')(config),
        endpoint: 'http://cloudpush.aliyuncs.com',
        apiVersion: '2016-08-01',
    },
);

