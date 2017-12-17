'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
const _ = require('lodash');
const moment = require('moment');
const common = Include("/services/v1.0/common");

const translate = (houses) => {
	return fp.map(house => {
		return house;
	})(houses);
};

function EntireCheck(body) {
    return Util.ParameterCheck(body,
            ['location', 'enabledFloors', 'roomCountOnFloor', 'totalFloor']
        );
}
function SoleCheck(body) {
    return Util.ParameterCheck(body,
            ['location', 'roomNumber', 'totalFloor', 'currentFloor', 'totalFloor']
        )
    && (_.isObject(body.layout) && !_.isArray(body.layout));
}
function ShareCheck(body) {
    return Util.ParameterCheck(body,
        ['location', 'roomNumber', 'totalFloor', 'currentFloor', 'totalFloor']
    )
    && (_.isObject(body.layout) && !_.isArray(body.layout));
}

async function SaveEntire(t, params, body){
    const projectId = params.projectId;

    if(body.layout){
        const layoutLen = body.layout.length;
        for(let i =0; i<layoutLen; i++){
            const layout = body.layout[i];
            if(!Typedef.IsOrientation(layout.orientation)){
                return ErrorCode.ack(ErrorCode.PARAMETERERROR, {'orientation': layout});
            }
        }
    }

    const BuildEntire = async(t, location)=>{

        const house = common.CreateHouse(projectId, Typedef.HouseFormat.ENTIRE, 0, ''
            , location.id, body.houseKeeper
            , body.desc, Typedef.OperationStatus.IDLE
            , body.config
        );
        const houseIns = await MySQL.Houses.create(house, {transaction: t, individualHooks: true});

        const entire = {
            // id: SnowFlake.next(),
            // projectId: projectId,
            // geoLocation: location.id,
            totalFloor: body.totalFloor,
            roomCountOnFloor: body.roomCountOnFloor,
            enabledFloors: body.enabledFloors,
            houseId: houseIns.id
            // createdAt: now.unix(),
            // config: body.config
        };
        await MySQL.Entire.create(entire, {transaction: t, individualHooks: true});
        return houseIns;
    };
    const BuildEntireLayouts = async(t, entireIns, layouts)=>{
        let bulkLayouts = [];
        layouts.map(layout=>{
            layout.id = SnowFlake.next();
            layout.houseId = entireIns.id;
            bulkLayouts.push(layout);
        });
        await MySQL.Layouts.bulkCreate(bulkLayouts, {transaction: t});
    };

    const BuildSoles = async(t, entireIns)=>{
        let soles = [];
        let houses = [];
        const enabledFloors = body.enabledFloors;
        enabledFloors.map(floor=>{
            for(let i=1;i<=body.roomCountOnFloor;i++){
                let roomNumber = '0' + i.toString();
                roomNumber = roomNumber.substr(roomNumber.length-2);
                roomNumber = floor + roomNumber;

                const house = common.CreateHouse(projectId, Typedef.HouseFormat.ENTIRE
                    , entireIns.id, '', entireIns.geoLocation
                    , body.houseKeeper, body.desc
                    , Typedef.OperationStatus.IDLE, entireIns.config);
                houses.push(house);
                const sole = common.CreateSole(0, house.id, '', '', '', roomNumber, floor, body.totalFloor);
                soles.push(sole);
                // soles.push({
                //     id: SnowFlake.next(),
                //     projectId: projectId,
                //     houseFormat: Typedef.HouseFormat.ENTIRE,
                //     geoLocation: entireIns.geoLocation,
                //     entireId: entireIns.id,
                //     roomNumber: roomNumber,
                //     currentFloor: floor,
                //     totalFloor: entireIns.totalFloor,
                //     createdAt: now.unix(),
                //     status: Typedef.OperationStatus.IDLE,
                //     config: entireIns.config,
                //     houseKeeper: entireIns.houseKeeper
                // });
            }
        });

        await MySQL.Houses.bulkCreate(houses, {transaction: t, individualHooks: true});
        await MySQL.Soles.bulkCreate(soles, {transaction: t, individualHooks: true});
        return houses;
    };
    const BuildSolesLayouts = async(items)=>{
        let layouts = [];
        items.map(item=>{
            layouts.push({
                id: SnowFlake.next(),
                houseId: item.id,
            });
        });

        await MySQL.Layouts.bulkCreate(layouts, {transaction: t});
    };

    try {
        const houseIns = await BuildEntire(t, body.location);
        houseIns.config;
        await BuildEntireLayouts(t, houseIns, body.layout);
        const soles = await BuildSoles(t, houseIns);
        await BuildSolesLayouts(soles);


        return true;
    }
    catch(e){
        log.error(e, params, body);
    }

    // MySQL.GeoLocation.findOne({
    //     where:{
    //         code: body.location.id
    //     },
    //     attributes:['id']
    // }).then(
    //     geoLocation=>{
    //         if(!geoLocation){
    //             return Transaction(body.location);
    //         }
    //
    //         MySQL.Entire.count({
    //             where:{
    //                 geoLocation: geoLocation.id
    //             }
    //         }).then(
    //             entireExists=>{
    //                 if(entireExists){
    //                     return reject(ErrorCode.ack(ErrorCode.DUPLICATEREQUEST));
    //                 }
    //
    //                 Transaction(body.location).then(
    //                     ()=>{
    //                         resolve();
    //                     },
    //                     err=>{
    //                         log.error(err);
    //                         return reject(ErrorCode.ack(ErrorCode.DATABASEEXEC));
    //                     }
    //                 );
    //             }
    //         );
    //     }
    // );
};
async function GetEntire(params, query) {
    const projectId = params.projectId;
    const houseId = query.entireId;

    //query variable priority
    let allSoleIds = [];
    let pagingSoleIds = [];

    // let where = {
    //     houseFormat: Typedef.HouseFormat.ENTIRE,
    //     projectId: projectId,
    //     parentId: 0
    // };
    let sql = `select h.id from ${MySQL.Houses.name} as h 
            INNER JOIN ${MySQL.Soles.name} as s ON s.houseId=h.id `;
    let where = [];
    if(houseId){
        // where.houseId = houseId;
        where.push(` h.id = entireId `);
    }
    if(query.status){
        // where.status = query.status;
        where.push( `h.status = :status` );
    }
    if(query.layoutId){
        //
        // where.layoutId = query.layoutId;
        where.push(`s.layoutId=:layoutId`);
    }
    if(query.floor){
        // where.currentFloor = query.floor;
        where.push(`s.currentFloor=:floor`);
    }
    if(query.q){
        // where.roomNumber = {$regexp: query.q};
        where.push(`s.roomNumber REGEXP :q `);
    }
    const final = MySQL.GenerateSQL(sql, where);
    const allEntire = MySQL.Exec(final, query);
    if(!allEntire || !allEntire.length){
        return [];
    }

    // const allEntire = await MySQL.Houses.findAll({
    //     where: where,
    //     attributes:['id']
    // });
    allEntire.map(sole=>{
        allSoleIds.push(sole.id);
        pagingSoleIds.push(sole.id);
    });

    let soleBedRoomIds = [];
    if(query.bedRooms){
        const bedRooms = await MySQL.Layouts.findAll({
            where:{
                houseId:{$in: allSoleIds},
                bedRoom: query.bedRooms
            },
            attributes:['houseId']
        });
        bedRooms.map(r=>{
            soleBedRoomIds.push(r.houseId);
        });
        pagingSoleIds = _.intersection(pagingSoleIds, bedRooms);
    }

    //paging
    const pagingInfo = Util.PagingInfo(query.index, query.size, true);
    const houses = await MySQL.Houses.findAll({
        where:{
            id:{$in: pagingSoleIds}
        },
        offset: pagingInfo.skip,
        limit: pagingInfo.size
    });

    let layoutHouseIds = [];
    let houseIds = [];
    let housesMapping = {};
    houses.map(house=>{
        const houseId = house.id;
        house.config;
        housesMapping[houseId] = MySQL.Plain(house);
        houseIds.push(houseId);

        layoutHouseIds.push(houseId);
    });

    const rooms = await MySQL.Houses.findAll({
        where:{
            parentId:{$in: houseIds}
        }
    });
    let roomMapping = {};
    let roomIds = [];
    rooms.map(room=>{
        room.config;
        roomMapping[room.id] = MySQL.Plain(room);
        roomIds.push(room.id);

        layoutHouseIds.push(room.id);
    });

    const result = await (async()=>{
        return [
            await MySQL.Layouts.findAll({
                where:{
                    houseId: {$in: layoutHouseIds}
                }
            }),
            await MySQL.Entire.findAll({
                where:{
                    houseId:{$in: houseIds}
                },
                attributes:['houseId', 'totalFloor', 'roomCountOnFloor', 'enabledFloors']
            })
        ]
    })();

    result[0].map(layout=>{
        const houseId = layout.houseId;
        if(housesMapping[houseId]){
            if(!housesMapping[houseId].layout){
                housesMapping[houseId].layout = [];
            }
            housesMapping[houseId].layout.push( MySQL.Plain(layout) );
        }
        else if(roomMapping[houseId]){
            roomMapping[houseId].layout = MySQL.Plain(layout);
        }
    });

    result[1].map(entire=>{
        if(housesMapping[entire.houseId]){
            const entireObj = _.pick(entire, ['totalFloor', 'roomCountOnFloor', 'enabledFloor']);
            housesMapping[entire.houseId] = _.assignIn(housesMapping[entire.houseId], entireObj);
        }
    });

    _.map(roomMapping, room=>{
        const parentId = room.parentId;
        if(housesMapping[parentId]){
            if(!housesMapping[parentId].rooms){
                housesMapping[parentId].rooms = [];
            }
            housesMapping[parentId].rooms.push(room);
        }
    });

    return {
            paging:{
                count: pagingSoleIds.length,
                index: pagingInfo.index,
                size: pagingInfo.size
            },
            data: _.toArray(housesMapping)
        };
}

async function SaveSole(t, params, body) {
    const projectId = params.projectId;
    const location = body.location;

    if(body.layout){
        if(!Typedef.IsOrientation(body.layout.orientation)){
            return ErrorCode.ack(ErrorCode.PARAMETERERROR, {'orientation': body.layout});
        }
    }

    const BuildSoles = async(t, location)=>{
        const house = common.CreateHouse(projectId, body.houseFormat, 0, ''
            , location.id, body.houseKeeper
            , body.desc, Typedef.OperationStatus.IDLE
            , body.config
        );
        const houseIns = await MySQL.Houses.create(house, {transaction: t, individualHooks: true});

        const sole = common.CreateSole(0, house.id, body.group, body.building, body.unit, body.roomNumber, body.currentFloor, body.totalFloor);
        await MySQL.Soles.create(sole, {transaction: t, individualHooks: true});
        return houseIns;
    };
    const BuildSolesLayouts = async(soleIns)=>{
        const layout = common.CreateLayout(
            soleIns.id,
            body.roomArea,
            body.name,
            body.bedRoom,
            body.livingRoom,
            body.bathRoom,
            body.orientation,
            body.remark
        );
        await MySQL.Layouts.create(layout);
    };

    const soleIns = await BuildSoles(t, location);
    await BuildSolesLayouts(soleIns);
}
async function GetSole(params, query) {
    const projectId = params.projectId;

    let geoLocationIds = [];
    if(query.locationId){
        geoLocationIds = [query.locationId];
    }
    else if(query.divisionId){
        let where = {};
        if(Util.IsParentDivision(query.divisionId)){
            where.divisionId = {$regexp: Util.ParentDivision(query.divisionId)};
            if(query.q){
                where.name = {$regexp: new RegExp(query.q)};
            }
        }
        else{
            where.divisionId = {$regexp: query.divisionId};
        }
        const locations = await MySQL.GeoLocation.findAll({
            where: where,
            attributes: ['id']
        });
        locations.map(loc=>{
            geoLocationIds.push(loc.id);
        });
    }
    //get the sole filter by location
    let soleIds = [];
    {
        let find = {
            where: {
                houseFormat: query.houseFormat,
                projectId: projectId
            },
            attributes: ['id']
        };
        let sql = `select h.id from ${MySQL.Houses.name} as h 
            INNER JOIN ${MySQL.Soles.name} as s ON s.houseId=h.id `;
        let where = [];
        if(geoLocationIds.length){
            // where.geoLocation = {$in: geoLocationIds};
            where.push( ` h.geoLocation In (${MySQL.GenerateSQLInArray(geoLocationIds)}) `);
        }
        if(query.status){
            where.push(`status = :status`);
            // find.where.status = query.status;
        }
        if(query.q){
            where.push( `s.roomNumber REGEXP :q or h.code REGEXP :q` );
            // where.$or = [
            //     {roomNumber: {$regexp: new RegExp(query.q)}},
            //     {code: {$regexp: new RegExp(query.q)}}
            // ];
        }

        const final = MySQL.GenerateSQL(sql, where);
        const soles = MySQL.Exec(final, query);
        if(!soles || !soles.length){
            return [];
        }
        // const soles = await MySQL.Houses.findAll(find);
        soles.map(sole=>{
            soleIds.push(sole.id);
        });
    }

    if(query.bedRooms){
        const bedRooms = await MySQL.Layouts.findAll({
            where:{
                houseId:{$in: soleIds},
                bedRoom: query.bedRooms
            },
            attributes:['houseId']
        });
        soleIds = [];
        bedRooms.map(r=>{
            soleIds.push(r.houseId);
        });
    }

    //paging
    const pagingInfo = Util.PagingInfo(query.index, query.size, true);
    const soles = await MySQL.Houses.findAll({
        where:{
            id:{$in: soleIds}
        },
        offset: pagingInfo.skip,
        limit: pagingInfo.size
    });

    soleIds = [];
    let locationIds = [];
    let soleMapping = {};
    soles.map(sole=>{
        sole.config;
        soleMapping[sole.id] = MySQL.Plain(sole);
        soleIds.push(sole.id);
        locationIds.push(sole.geoLocation);
    });

    const result = await (async()=>{
        return [
            await MySQL.Layouts.findOne({
                where:{
                    houseId: {$in: soleIds}
                }
            }),
            await MySQL.GeoLocation.findAll({
                where:{
                    id:{$in: locationIds}
                }
            })
        ]
    })();

    const layout = result[0];
    const locations = result[1];

    if(soleMapping[layout.houseId]){
        soleMapping[layout.houseId].layout = layout;
    }

    let locationMapping = {};
    locations.map(location=>{
        locationMapping[location.id] = location;
    });

    _.each(soleMapping, sole=>{
        if(locationMapping[sole.geoLocation]){
            sole.location = locationMapping[sole.geoLocation];
        }
    });

    return {
        paging:{
            count: soleIds.length,
            index: pagingInfo.index,
            size: pagingInfo.size
        },
        data: _.toArray(soleMapping)
    }
}

async function SaveShare(t, params, body) {

    const projectId = params.projectId;
    const location = body.location;

    if(body.layout){
        if(!Typedef.IsOrientation(body.layout.orientation)){
            return ErrorCode.ack(ErrorCode.PARAMETERERROR, {'orientation': body.layout});
        }
    }

    const BuildSoles = async(t, location)=>{
        const house = common.CreateHouse(projectId, body.houseFormat, 0, ''
            , location.id, body.houseKeeper
            , body.desc, Typedef.OperationStatus.IDLE
            , body.config
        );
        const houseIns = await MySQL.Houses.create(house, {transaction: t, individualHooks: true});

        const sole = common.CreateSole(0, house.id, body.group, body.building, body.unit, body.roomNumber, body.currentFloor, body.totalFloor);
        await MySQL.Soles.create(sole, {transaction: t, individualHooks: true});
        return houseIns;
    };
    const BuildSoleLayout = async(t, soleIns)=>{
        const layout = common.CreateLayout(
            soleIns.id,
            body.roomArea,
            body.name,
            body.bedRoom,
            body.livingRoom,
            body.bathRoom,
            body.orientation,
            body.remark
        );
        await MySQL.Layouts.create(layout);
    };
    const BuildRooms = (t, soleIns)=>{
        let bedRoom = body.layout.bedRoom;
        let rooms = [];
        let i = 65;
        do{
            let room = common.CreateHouse(projectId, body.houseFormat, soleIns.id,
                 '', soleIns.geoLocation, soleIns.houseKeeper, '',
                 Typedef.OperationStatus.IDLE, []
            );
            room.name = String.fromCharCode(i++);
            rooms.push(room);
        }while(--bedRoom);

        return MySQL.Houses.bulkCreate(rooms, {transaction: t, individualHooks: true});
    };
    const BuildRoomLayout = (t, rooms)=>{
        let layouts = [];
        rooms.map(room=>{
            const layout = {
                id: SnowFlake.next(),
                houseId: room.id,
            };
            layouts.push(layout);
        });

        return MySQL.Layouts.bulkCreate(layouts, {transaction: t});
    };


    const soleIns = await BuildSoles(t, location);
    await BuildSoleLayout(t, soleIns);
    const rooms = await BuildRooms(t, soleIns);
    await BuildRoomLayout(t, rooms);

    // const Transaction = async(location)=>{
    //     return MySQL.Sequelize.transaction(t=>{
    //         return common.UpsertGeoLocation(location, t).then(
    //             location=> {
    //                 return BuildSoles(t, location[0]).then(
    //                     soleIns=>{
    //                         return BuildSoleLayout(t, soleIns).then(
    //                             ()=>{
    //                                 return BuildRooms(t, soleIns).then(
    //                                     rooms=>{
    //                                         return BuildRoomLayout(t, rooms);
    //                                     }
    //                                 );
    //                             }
    //                         );
    //                     }
    //                 );
    //             }
    //         );
    //     });
    // };
    // MySQL.GeoLocation.findOne({
    //     where:{
    //         code: body.location.id
    //     },
    //     attributes:['id']
    // }).then(
    //     geoLocation=>{
    //         if(!geoLocation){
    //             return Transaction(body.location);
    //         }
    //
    //         MySQL.Soles.count({
    //             where:{
    //                 geoLocation: geoLocation.id
    //             }
    //         }).then(
    //             soleExists=>{
    //                 if(soleExists){
    //                     return reject(ErrorCode.ack(ErrorCode.DUPLICATEREQUEST));
    //                 }
    //
    //                 Transaction(body.location).then(
    //                     ()=>{
    //                         resolve(ErrorCode.ack(ErrorCode.OK));
    //                     },
    //                     err=>{
    //                         log.error(err);
    //                         return reject(ErrorCode.ack(ErrorCode.DATABASEEXEC));
    //                     }
    //                 );
    //             }
    //         );
    //     }
    // );
}

const locationIds = async(query) => {
	if(query.divisionId){
		let where = {};
		if(Util.IsParentDivision(query.divisionId)){
			where.divisionId = {$regexp: Util.ParentDivision(query.divisionId)};
			if(query.q){
				where.name = {$regexp: new RegExp(query.q)};
			}
		}
		else{
			where.divisionId = {$regexp: query.divisionId};
		}
		const locations = await MySQL.GeoLocation.findAll({
			where: where,
			attributes: ['id']
		});
		return _.compact(_.concat([query.locationId], _.map(locations, 'id')));
	}
	return _.compact([query.locationId]);
}

async function GetShare(params, query) {
	const projectId = params.projectId;
	const Houses = MySQL.Houses;
	const Soles = MySQL.Soles;
	const GeoLocation = MySQL.GeoLocation;
	const Layouts = MySQL.Layouts;
	const Op = MySQL.Sequelize.Op;

	const geoLocationIds = await locationIds(query);

	const locationCondition = !_.isEmpty(geoLocationIds) ? {
		geoLocation: {
			[Op.in]: geoLocationIds
		}
	} : {};

	const statusCondition = query.status ? {
		status: {
			[Op.eq]: query.status
		}
	} : {};

	const qCondition = query.q ? {
		$or: {
			'$sole.roomNumber$': {$regexp: query.q},
			code: {$regexp: query.q}
		}
	} : {};

	const where = _.assign({projectId}, locationCondition, statusCondition, qCondition);
	console.log(where);
	const modelLayouts = query.bedRooms ?
		{model: Layouts, where: {bedRoom: {[Op.eq]: query.bedRooms}}}
		: Layouts;

	const pagingInfo = Util.PagingInfo(query.index, query.size, true);
	const results = await Houses.findAll({
		include: [{model: Soles, required: true},
			{model: GeoLocation, as: 'location'},
			modelLayouts,
			'rooms'],
		where: where,
		offset: pagingInfo.skip,
		limit: pagingInfo.size
	})

	return {
		paging: {
			count: results.length,
			index: pagingInfo.index,
			size: pagingInfo.size
		},
		results
	};
}

module.exports = {
	/**
	 * summary: search houses
	 * description: pass hid or query parameter to get houese list

	 * parameters: hfmt, community, searchkey, status, division, rooms, floors, housetype, offset, limit
	 * produces: application/json
	 * responses: 200, 400
	 */
	get: (req, res, next)=>{
		/**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
        (async()=>{
            const query = req.query;
            const params = req.params;

            if(!Util.ParameterCheck(query,
                    ['houseFormat']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            let result;
            try {
                switch (query.houseFormat) {
                    case Typedef.HouseFormat.ENTIRE:
                        result = await GetEntire(params, query);
                        break;
                    case Typedef.HouseFormat.SOLE:
                        result = await GetSole(params, query);
                        break;
                    case Typedef.HouseFormat.SHARE:
                        result = await GetShare(params, query);
                        break;
                }

                res.send(result);
            }
            catch(e){
                log.error(e, query, params);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        })();
	},
	/**
	 * summary: save house
	 * description: save house information

	 * parameters: body
	 * produces: application/json
	 * responses: 200, 400
	 */
	post: (req, res)=>{
		/**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
        (async()=>{
            const params = req.params;
            const body = req.body;
            if(!Util.ParameterCheck(body,
                    ['houseFormat']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            if(!Util.ParameterCheck(body.location, ['id', 'divisionId', 'name', 'district', 'address', 'latitude', 'longitude'])){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            let formatPassed = false;
            switch(body.houseFormat){
                case Typedef.HouseFormat.ENTIRE:
                    formatPassed = EntireCheck(body);
                    break;
                case Typedef.HouseFormat.SOLE:
                    formatPassed = SoleCheck(body);
                    break;
                case Typedef.HouseFormat.SHARE:
                    formatPassed = ShareCheck(body);
                    break;
            }
            if(!formatPassed){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            try{
                const location = await MySQL.GeoLocation.findOne({
                    where:{
                        code: body.location.code
                    },
                    attributes:['id']
                });

                const t = await MySQL.Sequelize.transaction();
                if(!location){
                    // await SaveHouses(params, body, location.id);
                    const newLocation = await common.AsyncUpsertGeoLocation(body.location, t);
                    body.location = MySQL.Plain( newLocation[0] );
                }
                else {

                    const entireExists = await MySQL.Houses.count({
                        where: {
                            geoLocation: location.id
                        }
                    });

                    if (entireExists) {
                        return res.send(400, ErrorCode.ack(ErrorCode.DUPLICATEREQUEST));
                    }
                }

                const houseFormat = body.houseFormat;
                let ack;
                switch(houseFormat){
                    case Typedef.HouseFormat.ENTIRE:
                        ack = await SaveEntire(t, params, body);
                        break;
                    case Typedef.HouseFormat.SOLE:
                        ack = await SaveSole(t, params, body);
                        break;
                    case Typedef.HouseFormat.SHARE:
                        ack = await SaveShare(t, params, body);
                        break;
                }

                await t.commit();
                res.send();
            }
            catch(e){
                log.error(e);
                res.send(422, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        })();

		// if(!promise){
		// 	return res.send(500, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
		// }
        //
		// promise.then(
		// 	resolve=>{
		// 		res.send(resolve);
		// 	},
		// 	err=>{
		// 		res.send(422, err)
		// 	}
		// );
    }
};
