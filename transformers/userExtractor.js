'use strict';

const fp = require('lodash/fp');
const crypto = require('crypto');
const {assignNewId} = require('../services/v1.0/common');

exports.extract = req => assignNewId(fp.get('user')(req.body));

exports.extractAuth = async (req) => {
  const user = exports.extract(req);
  const password = crypto.createHash('md5').
    update('123456').
    digest('hex');
  return assignNewId({
    id: user.id,
    projectId: req.params.projectId,
    password,
    username: user.accountName,
    email: user.email,
    mobile: user.mobile,
    level: 'USER',
  });
};