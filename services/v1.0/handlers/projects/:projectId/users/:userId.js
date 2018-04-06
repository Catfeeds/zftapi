'use strict';

const fp = require('lodash/fp');
const translate = model => {
    const user = model.toJSON();
    return fp.omit('auth')(fp.defaults(user.auth)(user));
};

module.exports = {
    get: async (req, res) => {
        const {projectId, userId} = req.params;

        return MySQL.Users.findById(userId, {
            include: [
                {
                    model: MySQL.CashAccount,
                    as: 'cashAccount',
                    attributes: ['balance'],
                },
                {
                    model: MySQL.Auth,
                    attributes: ['username', 'email', 'mobile'],
                },
            ],
        }).then(translate).then(user => res.send(user),
        ).catch(err => {
            log.error(err, projectId, userId);
            res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        });
    }
};
