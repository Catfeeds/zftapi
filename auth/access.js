'use strict';

const fp = require('lodash/fp');

const matchLevel = req => level =>
  !fp.isUndefined(req.isAuthenticated)
		&& req.isAuthenticated()
		&& fp.getOr(Typedef.CredentialLevels.UNKNOWN)('user.level')(req).toUpperCase() === level;

const allowToCreateCredentials = req => matchLevel(req)(Typedef.CredentialLevels.ADMIN)

const allowToResetPassword = (req) =>
  !fp.isUndefined(req.isAuthenticated)
		&& req.isAuthenticated()
		&& fp.includes(fp.getOr(Typedef.CredentialLevels.UNKNOWN)('user.level')(req).toUpperCase())([Typedef.CredentialLevels.ADMIN, Typedef.CredentialLevels.MANAGER]);

const allowToDeleteCredentials = allowToCreateCredentials;
const allowToCreateProject = req => matchLevel(req)(Typedef.CredentialLevels.OP);
const allowToSendNotification = allowToCreateCredentials;

module.exports = {
  allowToCreateCredentials,
  allowToDeleteCredentials,
  allowToSendNotification,
  allowToCreateProject,
  allowToResetPassword,
};