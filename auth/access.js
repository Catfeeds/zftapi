'use strict';
const _ = require('lodash');

const allowToCreateCredentials = (req) =>
	!_.isUndefined(req.isAuthenticated)
		&& req.isAuthenticated()
		&& _.get(req, 'user.level', Typedef.CredentialLevels.UNKNOWN).toUpperCase() === Typedef.CredentialLevels.ADMIN;

module.exports = {
	allowToCreateCredentials
};