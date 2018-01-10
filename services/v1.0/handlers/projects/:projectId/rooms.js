'use strict';

const _ = require('lodash');
const fp = require('lodash/fp');

/**
 * Operations on /rooms/{hid}
 */
const translate = (models, pagingInfo) => {
    const single = model => {
        const room = model.dataValues;
        const house = room.House.dataValues;
        const building = house.Building.dataValues;
        const location = building.Location.dataValues;
        return {
            id: room.id,
            houseId: house.id,
            locationName: location.name,
            group: building.group,
            building: building.building,
            unit: building.unit,
            roomNumber: house.roomNumber,
            roomName: room.name
        }
    };
    return {
        paging: {
            count: models.count,
            index: pagingInfo.index,
            size: pagingInfo.size
        },
        data: fp.map(single)(models.rows)
    }
};
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

        const houseCondition = _.assign(
            {projectId: params.projectId},
            query.houseFormat ? {houseFormat: query.houseFormat} : {}
        );

        const status = _.get(query, 'status', Typedef.OperationStatus.IDLE).toUpperCase();

        const modelOption = {
            include: [{
                model: Houses, required: true,
                as: 'House',
                where: houseCondition,
                attributes: ['id', 'roomNumber'],
                include: [{
                    model: Building, required: true, as: 'Building',
                    attributes: ['group', 'building', 'unit'],
                    include: [{
                        model: GeoLocation, required: true,
                        as: 'Location',
                        attributes: ['name']
                    }]
                }]
            }],
            where: {
                $or: [
                    {'$House.Building.Location.name$': {$regexp: query.q}},
                    {'$House.roomNumber$': {$regexp: query.q}}
                ],
				status
            },
            attributes: ['id', 'name'],
            offset: pagingInfo.skip,
            limit: pagingInfo.size
        };

        return Rooms.findAndCountAll(modelOption)
            .then(data => translate(data, pagingInfo))
            .then(data => res.send(data))
    }
};
