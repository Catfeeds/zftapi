'use strict';
/**
 * Operations on /projects/{projectid}/credentials
 */

const fp = require('lodash/fp');

const access = require('../../../../../auth/access');
const {omitSingleNulls, innerValues} = require('../../../common');

const translate = (items) => {
    const omitFields = fp.omit(['createdAt', 'updatedAt', 'password']);
    return fp.map(fp.pipe(innerValues, omitSingleNulls, omitFields))(items);
};

module.exports = {
    get: async function getCredentials(req, res) {
        const Auth = MySQL.Auth;
        const projectId = req.params.projectId;
        return Auth.findAll({
            where: {
                projectId,
            },
        }).
            then(translate).
            then(items => res.send(items)).
            catch(err => res.send(500,
                ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    },
    post: async function createCredentials(req, res) {
        const body = req.body;
        const Auth = MySQL.Auth;

        const projectId = req.params.projectId;
        const username = fp.getOr('')('username')(body);
        const level = fp.getOr('')('level')(body).toUpperCase();
        const password = fp.getOr('')('password')(body).toUpperCase();
        const email = fp.getOr('')('email')(body).toUpperCase();

        if (fp.isEmpty(password)) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: 'please provide md5 encrypted password'}));
        }

        if (fp.isEmpty(username)) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: 'username is required'}));
        }

        if (fp.isEmpty(email)) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: 'email is required'}));
        }

        if (fp.isEmpty(level)) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: 'level is required'}));
        }

        if (!access.allowToCreateCredentials(req)) {
            return res.send(403, ErrorCode.ack(ErrorCode.PERMISSIONDENIED,
                {error: 'only admin can create new login credentials'}));
        }

        if (!fp.includes(level)([
            Typedef.CredentialLevels.MANAGER,
            Typedef.CredentialLevels.ACCOUNTANT])) {
            return res.send(403, ErrorCode.ack(ErrorCode.PERMISSIONDENIED,
                {error: 'no allow to create admin level'}));
        }
        const profile = fp.defaults(body)(
            {projectId, level, password, username, email});
        return Auth.create(profile).
            then(user =>
                res.send(200,
                    ErrorCode.ack(ErrorCode.OK, {username: user.username})),
            ).
            catch(err => res.send(500,
                ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    },
};
