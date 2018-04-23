'use strict';

const fp = require('lodash/fp');
const {omitSingleNulls} = require('../../../../../common');

const inner = json => json.toJSON ? json.toJSON() : json;
const translate = pagingInfo => models => {
    return {
        paging: {
            count: models.count,
            index: pagingInfo.index,
            size: pagingInfo.size,
        },
        data: fp.map(fp.pipe(inner, omitSingleNulls))(models.rows),
    };
};

module.exports = {
    get: async (req, res) => {
        const projectId = req.params.projectId;
        const userId = req.params.userId;

        const UserNotifications = MySQL.UserNotifications;

        const {
            index: pageIndex, size: pageSize,
        } = req.query;

        const pagingInfo = Util.PagingInfo(pageIndex, pageSize, true);

        return UserNotifications.findAndCountAll({
            where: {
                projectId,
                userId,
            },
        }).then(translate(pagingInfo)).then(data => res.send(data));
        // .
        //     catch(err => res.send(500,
        //         ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    },
};