'use strict';

const moment = require('moment');

/**
 * Operations on /rooms/{hid}
 */
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
	get: (req, res, next)=>{
		/**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
		(async()=>{
			const params = req.params;
			const query = req.query;

			if(!Util.ParameterCheck(query,
					['houseFormat', 'q']
				)){
				return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
			}
			const pagingInfo = Util.PagingInfo(query.index, query.size, true);

			let sql = `select s.id as id, h.id as houseId, loc.name as locationName, b.group, b.building, b.unit, h.roomNumber 
			         from ${MySQL.Houses.name} as h
                     inner join ${MySQL.Rooms.name} as s on s.houseId = h.id
                     inner join ${MySQL.Building.name} as b on b.id = h.buildingId
                     inner join ${MySQL.GeoLocation.name} as loc on b.locationId = loc.id
                      where houseFormat=:houseFormat and (roomNumber regexp :q or loc.name regexp :q) `;
			const data = await MySQL.Exec(sql, query);

			res.send({
				paging:{
					count: data.length,
					index: pagingInfo.index,
					size: pagingInfo.size
				},
				data
            });


		})();
	}
};
