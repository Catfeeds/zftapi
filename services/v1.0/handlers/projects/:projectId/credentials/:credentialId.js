'use strict';

const fp = require('lodash/fp');
const omitSingleNulls = require('../../../../common').omitSingleNulls;
const innerValues = require('../../../../common').innerValues;
const allowToDeleteCredentials = require('../../../../../../auth/access').allowToDeleteCredentials;

const translate = fp.flow(innerValues,
    fp.omit(['createdAt', 'updatedAt', 'password']), omitSingleNulls);

const isMyself = (id, req) => fp.getOr(0)('user.id')(req).toString() === id.toString();

module.exports = {
    patch: async (req, res) => {
        const Auth = MySQL.Auth;
        const credentialId = req.params.credentialId;
        const password = fp.get('body.password')(req);
        const email = fp.get('body.email')(req);
        const mobile = fp.get('body.mobile')(req);

        if (password && !/\w{32}/.test(password)) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: 'please provide md5 encrypted password'}));
        }

        const updateFields = fp.omitBy(fp.isUndefined)(
            {password, email, mobile});

        return Auth.findById(credentialId).
            then(credential => credential.updateAttributes(updateFields)).
            then(result => res.json(
                ErrorCode.ack(ErrorCode.OK, translate(result)))).
            catch(err => res.send(500,
                ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    },

    delete: async (req, res) => {
        const Auth = MySQL.Auth;
        const credentialId = req.params.credentialId;

        if (!allowToDeleteCredentials(req)) {
            return res.send(403, ErrorCode.ack(ErrorCode.PERMISSIONDENIED,
                {error: 'Only admin can delete users.'}));
        }
        
        if (isMyself(credentialId, req)) {
            return res.send(403, ErrorCode.ack(ErrorCode.NOTSUPPORT,
                {error: 'Don\'t attempt to delete yourself.'}));
        }

        return Auth.findById(credentialId).
            then(credential => {
                if (fp.isEmpty(credential)) {
                    return res.send(404);
                }
                credential.destroy();
            }).
            then(() => res.json(ErrorCode.ack(ErrorCode.OK))).
            catch(err => res.send(500,
                ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    },
};