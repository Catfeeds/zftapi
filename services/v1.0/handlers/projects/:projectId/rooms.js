'use strict';

const _ = require('lodash');
const fp = require('lodash/fp');
const moment = require('moment');
const singleRoomTranslate = require('../../../common').singleRoomTranslate;

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
    }
};

const currentLeasingStatus = (contracts) => {
    const now = moment().unix();
	const simplified = fp.map(c => _.pick(c, ['from', 'to', 'id']))(contracts);

    const compactedContracts = fp.filter(c => !_.isUndefined(c.from))(simplified);
    // PAUSE
    if(fp.some(contract => (now > contract.from && _.isUndefined(contract.to)))(compactedContracts)) {
        return Typedef.OperationStatus.PAUSED;
    }
	return fp.some(contract => (now > contract.from && contract.to > now))(compactedContracts) ?
        Typedef.OperationStatus.INUSE : Typedef.OperationStatus.IDLE;
}
module.exports = {
    get: async (req, res) => {
        const params = req.params;
        const query = req.query;

        if (!Util.ParameterCheck(query, ['q'])) {
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        const pagingInfo = Util.PagingInfo(query.index, query.size, true);

        const Houses = MySQL.Houses;
        const Rooms = MySQL.Rooms;
        const Building = MySQL.Building;
        const GeoLocation = MySQL.GeoLocation;
        const Contracts = MySQL.Contracts;

        const houseCondition = _.assign(
            {projectId: params.projectId},
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
                    status: Typedef.ContractStatus.ONGOING,
                    //TODO: filter occupied rooms by default
                }
            }],
            where: {
                $or: [
                    {'$house.building.location.name$': {$regexp: query.q}},
                    {'$house.roomNumber$': {$regexp: query.q}}
                ]
            },
            attributes: ['id', 'name'],
            offset: pagingInfo.skip,
            limit: pagingInfo.size
        };

        return Rooms.findAndCountAll(modelOption)
            .then(data => {
				const rows = fp.map(single => {
					const status = currentLeasingStatus(single.contracts);
					return fp.merge(single)({dataValues: {status}});
				})(data.rows);
				console.log('res', rows[0]);
				const res = fp.defaults(data)({rows});
				console.log('res', res.rows[0]);
				return res;
            })
            .then(data => translate(data, pagingInfo))
            .then(data => res.send(data))
    }
};
