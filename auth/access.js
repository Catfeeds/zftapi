'use strict';

const fp = require('lodash/fp');

const allowToCreateCredentials = (req) =>
    !fp.isUndefined(req.isAuthenticated)
		&& req.isAuthenticated()
		&& fp.getOr(Typedef.CredentialLevels.UNKNOWN)('user.level')(req).toUpperCase() === Typedef.CredentialLevels.ADMIN;

const allowToDeleteCredentials = allowToCreateCredentials;
const allowToSendNotification = allowToCreateCredentials;

module.exports = {
    allowToCreateCredentials,
    allowToDeleteCredentials,
    allowToSendNotification,
};