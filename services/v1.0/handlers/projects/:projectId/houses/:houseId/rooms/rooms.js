'use strict';

const moment = require('moment');
const _ = require('lodash');
const fp = require('lodash/fp');

/**
 * Operations on /rooms/{hid}
 */
const translate = (models, pagingInfo) => {
	console.log(models);
	console.log(pagingInfo);
	const single = model => {
		const room = model.dataValues;
		const house = room.house.dataValues;
		const building = house.building.dataValues;
		const location = building.location.dataValues;
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
			}],
			where: {
				$or: [
					{'$house.Building.Location.name$': {$regexp: query.q}},
					{'$house.roomNumber$': {$regexp: query.q}}
				]
			},
			attributes: ['id', 'name'],
			offset: pagingInfo.skip,
			limit: pagingInfo.size
		};

		Rooms.findAndCountAll(modelOption)
			.then(data => translate(data, pagingInfo))
			.then(data => res.send(data))
	}
};
