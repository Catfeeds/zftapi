'use strict';
/**
 * Operations on /projects/{projectid}/credentials
 */

const fp = require('lodash/fp');
const _ = require('lodash');

const access = require('../../../../../auth/access');
const omitSingleNulls = require('../../../common').omitSingleNulls;
const innerValues = require('../../../common').innerValues;

const translate = (items) => {
	const omitFields = item => _.omit(item, ['id', 'createdAt', 'updatedAt', 'password']);
	return fp.map(_.flow(innerValues, omitSingleNulls, omitFields))(items)
};

module.exports = {
	get: async function getCredentials(req, res) {
		const Auth = MySQL.Auth;
		const projectId = req.params.projectId;
		return Auth.findAll({
			where: {
				projectId
			}
		})
			.then(translate)
			.then(items => res.send(items))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	},
	post: async function createCredentials(req, res) {
		const body = req.body;
		const Auth = MySQL.Auth;

		const projectId = req.params.projectId;
		const username = _.get(body, 'username', '');
		const level = _.get(body, 'level', '').toUpperCase();
		const password = _.get(body, 'password', '').toUpperCase();
		const email = _.get(body, 'email', '').toUpperCase();

		if(_.isEmpty(password)) {
			return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {error: "please provide md5 encrypted password"}));
		}

		if(_.isEmpty(username)) {
			return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {error: "username is required"}));
		}

		if(_.isEmpty(email)) {
			return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {error: "email is required"}));
		}

		if(_.isEmpty(level)) {
			return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {error: "level is required"}));
		}

		if(!access.allowToCreateCredentials(req)) {
			return res.send(403, ErrorCode.ack(ErrorCode.PERMISSIONDENIED, {error: "only admin can create new login credentials"}));
		}

		if(!_.includes([Typedef.CredentialLevels.MANAGER, Typedef.CredentialLevels.ACCOUNTANT], level)) {
			return res.send(403, ErrorCode.ack(ErrorCode.PERMISSIONDENIED, {error: "no allow to create admin level"}));
		}
		const profile = fp.defaults(body)({projectId, level, password, username, email});
		return Auth.create(profile)
			.then(user =>
				res.send(200, ErrorCode.ack(ErrorCode.OK, {username: user.username}))
			).catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	}
};
