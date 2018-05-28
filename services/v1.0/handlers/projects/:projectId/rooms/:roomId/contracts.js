'use strict';

const fp = require('lodash/fp');
const {omitSingleNulls} = require(
    '../../../../../common');

const pickMobile = model => ({
    ...model,
    user: {
        ...model.user,
        mobile: fp.get('user.auth.mobile')(model),
    },
});

const removeAuth = fp.omit('user.auth');

const translate = (models, pagingInfo) => {
    const single = fp.pipe(a => a.toJSON(), pickMobile, removeAuth, omitSingleNulls);
    return {
        paging: {
            count: models.count,
            index: pagingInfo.index,
            size: pagingInfo.size,
        },
        data: fp.map(single)(models.rows),
    };
};

module.exports = {
    get: async (req, res) => {
        const projectId = req.params.projectId;
        const roomId = req.params.roomId;
        const query = req.query;
        const status = fp.getOr(Typedef.ContractStatus.ONGOING)('query.status')(
            req).toUpperCase();
        const Contracts = MySQL.Contracts;
        const Users = MySQL.Users;
        const Auth = MySQL.Auth;

        const pagingInfo = Util.PagingInfo(query.index, query.size, true);

        return Contracts.findAndCountAll({
            include: [{model: Users, attributes: ['name', 'gender'],
                include: [{
                    model: Auth,
                    attributes: ['mobile']
                }]
            }],
            attributes: ['from', 'to', 'status', 'strategy'],
            distinct: true,
            where: {projectId, roomId, status},
            offset: pagingInfo.skip,
            limit: pagingInfo.size,
        }).
            then(data => translate(data, pagingInfo)).
            then(contracts => res.send(contracts)).
            catch(err => res.send(500,
                ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    },
};