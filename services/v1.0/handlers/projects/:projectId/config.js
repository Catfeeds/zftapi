'use strict';
/**
 * Operations on /projects/{projectid}/config
 */

const {omitNulls} = require('../../../common');

const translate = omitNulls;

module.exports = {
    get: function getConfig(req, res) {
        const Settings = MySQL.Settings;
        const Op = MySQL.Sequelize.Op;
        Settings.findAll({
            where: {
                projectId: {
                    [Op.or]: [req.params.projectId, null]
                }
            }
        })
            .then(translate)
            .then(items => res.send(items))
            .catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    },
    post: function createConfig(req, res) {
        const body = req.body;
        const Settings = MySQL.Settings;
        Settings.create(body)
            .then(setting =>
                res.send(200, ErrorCode.ack(ErrorCode.OK, {req: req.body, res: setting}))
            ).catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    }
};
