'use strict';
const _ = require('lodash');

const allowToCreateCredentials = (req) => req.isAuthenticated() && _.get(req, 'user.level', 'manager') === 'admin'

module.exports = {
	allowToCreateCredentials
}