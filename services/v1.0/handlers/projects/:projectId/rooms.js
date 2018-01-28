'use strict';

const fp = require('lodash/fp');
const moment = require('moment');
const singleRoomTranslate = require('../../../common').singleRoomTranslate;
const roomLeasingStatus = require('../../../common').roomLeasingStatus;

/**
 * Operations on /rooms/{hid}
 */
const translate = (models, pagingInfo) => {
    return {
        paging: {
            count: models.count,
            index: pagingInfo.index,
            size: pagingInfo.size
        },
        data: fp.map(singleRoomTranslate)(models.rows)
    };
};

module.exports = {
    get: async (req, res) => {
        const params = req.params;
        const query = req.query;
        const projectId = params.projectId;

        if (!Util.ParameterCheck(query, ['q'])) {
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        const pagingInfo = Util.PagingInfo(query.index, query.size, true);

        const Houses = MySQL.Houses;
        const Rooms = MySQL.Rooms;
        const Building = MySQL.Building;
        const GeoLocation = MySQL.GeoLocation;
        const Contracts = MySQL.Contracts;
        const SuspendingRooms = MySQL.SuspendingRooms;
        const Sequelize = MySQL.Sequelize;

        const houseCondition = fp.defaults({projectId: params.projectId})(
            query.houseFormat ? {houseFormat: query.houseFormat} : {}
        );

        const modelOption = {
            include: [{
                model: Houses, required: true,
                as: 'house',
                where: houseCondition,
                attributes: ['id', 'roomNumber'],
                include: [{
                    model: Building, required: true, as: 'building',
                    attributes: ['group', 'building', 'unit'],
                    include: [{
                        model: GeoLocation, required: true,
                        as: 'location',
                        attributes: ['name']
                    }]
                }]
            }, {
                model: Contracts,
                attributes: ['id', 'from', 'to'],
                required: false,
                where: {
                    status: Typedef.ContractStatus.ONGOING
                }
            }, {
                model: SuspendingRooms,
                attributes: ['id', 'from', 'to'],
                required: false
            }],
            distinct: true,
            where: {
                $or: [
                    {'$house.building.location.name$': {$regexp: query.q}},
                    {'$house.roomNumber$': {$regexp: query.q}}
                ],
                id: {
                    $in: Sequelize.literal(`( select id from rooms r where 
											(id not in (select roomId from suspendingRooms s where s.projectId=${projectId} and \`to\` is NULL))
											and (
 											(id not in (select roomId from contracts c where c.projectId=${projectId}))
                           						or
 											(id not in (select roomId from contracts c where c.projectId=${projectId} and \`from\` < ${moment().unix()} and \`status\` = 'ONGOING' ) )) ) `)
                }
            },
            attributes: ['id', 'name'],
            offset: pagingInfo.skip,
            limit: pagingInfo.size
        };

        return Rooms.findAndCountAll(modelOption)
            .then(data => {
                const rows = fp.map(single => {
                    const status = roomLeasingStatus(single.contracts, single.suspendingRooms);
                    return fp.merge(single)({dataValues: {status}});
                })(data.rows);
                return fp.defaults(data)({rows});
            })
            .then(data => translate(data, pagingInfo))
            .then(data => res.send(data));
    }
};
