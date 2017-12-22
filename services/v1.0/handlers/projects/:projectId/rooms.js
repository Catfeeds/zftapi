'use strict';

const moment = require('moment');
const _ = require('lodash');
const fp = require('lodash/fp');

/**
 * Operations on /rooms/{hid}
 */
const translate = models => {
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
	return fp.map(single)(models);
};
module.exports = {
    post: (req, res, next)=>{
        //
        (async()=>{
            const projectId = req.params.projectId;
            const body = req.body;

            if(!Util.ParameterCheck(body,
                    ['id']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            const now = moment();
            const sole = await MySQL.Soles.findOne({
                where:{
                    id: body.id,
                    projectId: projectId,
                    houseFormat: Typedef.HouseFormat.SHARE
                }
            });
            if(!sole){
                return res.send(ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
            }

            const newRoom = {
                id: SnowFlake.next(),
                projectId: sole.projectId,
                soleId: sole.id,
                createdAt: now.unix(),
                status: Typedef.OperationStatus.IDLE,
                config: []
            };

            const t = await MySQL.Sequelize.transaction();
            await MySQL.Rooms.create(newRoom, {transaction: t});

            const layout = await MySQL.Layouts.create({
                id: SnowFlake.next(),
                houseId: newRoom.id
            }, {transaction: t});

            t.commit();

            newRoom.layout = layout;

            res.send(ErrorCode.ack(ErrorCode.OK, newRoom));
        })();
    },
	get: (req, res) => {
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
				]
			},
			attributes: ['id', 'name']
		};

		Rooms.findAll(modelOption)
			.then(translate)
			.then(data => {
				res.send({
					paging: {
						count: data.length,
						index: pagingInfo.index,
						size: pagingInfo.size
					},
					data
				});
			})
	}
};
