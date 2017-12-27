'use strict';
const _ = require('lodash');

const allowToCreateCredentials = (req) =>
	!_.isUndefined(req.isAuthenticated)
		&& req.isAuthenticated()
		&& _.get(req, 'user.level', 'unknown') === 'admin';

module.exports = {
	allowToCreateCredentials
}