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
    && _.isObject(body.layout);
}
function ShareCheck(body) {
    return Util.ParameterCheck(body,
        ['location', 'roomNumber', 'totalFloor', 'currentFloor', 'totalFloor']
    )   ;
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
            layout.instanceId = entireIns.id;
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
                instanceId: item.id,
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
function GetEntire(params, query) {
	return new Promise((resolve, reject)=>{
        const projectId = params.projectId;
        const entireId = query.entireId;

        (async()=>{
            //query variable priority
            let allSoleIds = [];
            let pagingSoleIds = [];
            const allSoles = await MySQL.Soles.findAll({
                where:{
                    houseFormat: Typedef.HouseFormat.ENTIRE,
                    projectId: projectId,
                    entireId: entireId
                },
                attributes:['id']
            });
            allSoles.map(sole=>{
                allSoleIds.push(sole.id);
                pagingSoleIds.push(sole.id);
            });

            let soleBedRoomIds = [];
            if(query.bedRooms){
                const bedRooms = await MySQL.Layouts.findAll({
                    where:{
                        instanceId:{$in: allSoleIds},
                        bedRoom: query.bedRooms
                    },
                    attributes:['instanceId']
                });
                bedRooms.map(r=>{
                    soleBedRoomIds.push(r.instanceId);
                });
                pagingSoleIds = _.intersection(pagingSoleIds, bedRooms);
            }

            let soleStatusIds = [];
            if(query.status){
                const bedRooms = await MySQL.Layouts.findAll({
                    where:{
                        instanceId:{$in: allSoleIds},
                        status: query.status
                    },
                    attributes:['instanceId']
                });
                bedRooms.map(r=>{
                    soleStatusIds.push(r.id);
                });
                pagingSoleIds = _.intersection(pagingSoleIds, soleStatusIds);
            }


            let soleWhere = {
            };
            if(query.layoutId){
                //
                soleWhere.layoutId = query.layoutId;
            }
            if(query.floor){
                soleWhere.currentFloor = query.floor;
            }
            if(query.q){
                soleWhere.roomNumber = {$regexp: query.q};
            }
            if(!_.isEmpty(soleWhere)){
                soleWhere.projectId = projectId;
                soleWhere.entireId = entireId;

                let solesIds = [];
                const soleQuery = await MySQL.Soles.findAll({
                    where: soleWhere,
                    attributes: ['id']
                });
                soleQuery.map(r=>{
                    solesIds.push(r.id);
                });

                pagingSoleIds = _.intersection(pagingSoleIds, solesIds);
            }

            //paging
            const pagingInfo = Util.PagingInfo(query.index, query.size, true);
            MySQL.Soles.findAll({
                where:{
                    id:{$in: pagingSoleIds}
                },
                offset: pagingInfo.skip,
                limit: pagingInfo.size
            }).then(
                soles=>{
                    let soleIds = [];
                    let soleMapping = {};
                    soles.map(sole=>{
                        soleMapping[sole.id] = sole;
                        soleIds.push(sole.id);
                    });

                    MySQL.Layouts.findAll({
                        where:{
                            instanceId: soleIds
                        }
                    }).then(
                        layouts=>{
                            layouts.map(layout=>{
                                if(soleMapping[layout.instanceId]){
                                    soleMapping[layout.instanceId].layout = layout;
                                }
                            });

                            resolve(ErrorCode.ack(ErrorCode.OK,
                                {
                                    paging:{
                                        count: pagingSoleIds.length,
                                        index: pagingInfo.index,
                                        size: pagingInfo.size
                                    },
                                    data: _.toArray(soleMapping)
                                }
                            ));
                        }
                    );
                },
                err=>{
                    log.error(err, pagingSoleIds);
                    reject(ErrorCode.ack(ErrorCode.DATABASEEXEC));
                }
            );
        })();
	});
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
function GetSole(params, query) {
	return new Promise((resolve, reject)=>{
        const projectId = params.projectId;

        (async()=>{

            //
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
                let where = {
                    houseFormat: Typedef.HouseFormat.SOLE,
                    projectId: projectId,
                    geoLocation: {$in: geoLocationIds}
                };
                if(query.status){
                    where.status = query.status;
                }
                if(query.q){
                    where.$or = [
                        {roomNumber: {$regexp: new RegExp(query.q)}},
                        {code: {$regexp: new RegExp(query.q)}}
                    ];
                }
                const soles = await MySQL.Soles.findAll({
                    where: where,
                    attributes: ['id']
                });
                soles.map(sole=>{
                    soleIds.push(sole.id);
                });
            }

            if(query.bedRooms){
                const bedRooms = await MySQL.Layouts.findAll({
                    where:{
                        instanceId:{$in: soleIds},
                        bedRoom: query.bedRooms
                    },
                    attributes:['instanceId']
                });
                soleIds = [];
                bedRooms.map(r=>{
                    soleIds.push(r.instanceId);
                });
            }

            //paging
            const pagingInfo = Util.PagingInfo(query.index, query.size, true);
            MySQL.Soles.findAll({
                where:{
                    id:{$in: soleIds}
                },
                offset: pagingInfo.skip,
                limit: pagingInfo.size
            }).then(
                soles=>{
                    let soleIds = [];
                    let locationIds = [];
                    let soleMapping = {};
                    soles.map(sole=>{
                        sole.config;
                        soleMapping[sole.id] = MySQL.Plain(sole);
                        soleIds.push(sole.id);
                        locationIds.push(sole.geoLocation);
                    });

                    Promise.all([
                        MySQL.Layouts.findOne({
                            where:{
                                instanceId: {$in: soleIds}
                            }
                        }),
                        MySQL.GeoLocation.findAll({
                            where:{
                                id:{$in: locationIds}
                            }
                        })
                    ]).then(
                        result=>{
                            const layout = result[0];
                            const locations = result[1];

                            if(soleMapping[layout.instanceId]){
                                soleMapping[layout.instanceId].layout = layout;
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

                            resolve(ErrorCode.ack(ErrorCode.OK,
                                {
                                    paging:{
                                        count: soleIds.length,
                                        index: pagingInfo.index,
                                        size: pagingInfo.size
                                    },
                                    data: _.toArray(soleMapping)
                                }
                            ));
                        }
                    );
                },
                err=>{
                    log.error(err, soleIds);
                    reject(ErrorCode.ack(ErrorCode.DATABASEEXEC));
                }
            );


        })();
	});
}

function SaveShare(params, body) {
    return new Promise((resolve, reject)=>{
        if(!Util.ParameterCheck(body,
                ['location', 'roomNumber', 'totalFloor', 'currentFloor', 'totalFloor']
            )){
            return reject(ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        if(!Util.ParameterCheck(body.location, ['id', 'divisionId', 'name', 'district', 'address', 'latitude', 'longitude'])){
            return reject(ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        const projectId = params.projectId;

        if(body.layout){
            if(!Typedef.IsOrientation(body.layout.orientation)){
                return reject(ErrorCode.ack(ErrorCode.PARAMETERERROR, {'orientation': body.layout}));
            }
        }

        const now = moment();

        const BuildSoles = (t, location)=>{
            let soleIns = {
                id: SnowFlake.next(),
                projectId: projectId,
                houseFormat: Typedef.HouseFormat.SHARE,
                code: body.code,
                geoLocation: location.id,
                group: body.group,
                building: body.building,
                unit: body.unit,
                roomNumber: body.roomNumber,
                currentFloor: body.currentFloor,
                totalFloor: body.totalFloor,
                createdAt: now.unix(),
                status: Typedef.OperationStatus.IDLE,
                config: body.config,
                houseKeeper: body.houseKeeper
            };
            return MySQL.Soles.create(soleIns, {transaction: t, individualHooks: true});
        };
        const BuildSoleLayout = (t, soleIns)=>{
            const layout = {
                id: SnowFlake.next(),
                instanceId: soleIns.id,
                bedRoom: body.bedRoom,
                livingRoom: body.livingRoom,
                bathRoom: body.bathRoom,
                orientation: body.orientation,
                roomArea: body.roomArea
            };

            return MySQL.Layouts.create(layout, {transaction: t});
        };
        const BuildRooms = (t, soleIns)=>{
             let bedRoom = body.layout.bedRoom;
             let rooms = [];
             let name = 'A';
             do{
                 let room = {
                     id: SnowFlake.next(),
                     projectId: projectId,
                     name: bedRoom.toString(),
                     soleId: soleIns.id,
                     createdAt: now.unix(),
                     status: Typedef.OperationStatus.IDLE
                 };
                 rooms.push(room);
             }while(--bedRoom);

             return MySQL.Rooms.bulkCreate(rooms, {transaction: t, individualHooks: true});
        };
        const BuildRoomLayout = (t, rooms)=>{
            let layouts = [];
            let i = 65;
            rooms.map(room=>{
                const layout = {
                    id: SnowFlake.next(),
                    instanceId: room.id,
                    name: String.fromCharCode(i++)
                };
                layouts.push(layout);
                i++;
            });

            return MySQL.Layouts.bulkCreate(layouts, {transaction: t});
        };

        const Transaction = async(location)=>{
            return MySQL.Sequelize.transaction(t=>{
                return common.UpsertGeoLocation(location, t).then(
                    location=> {
                        return BuildSoles(t, location[0]).then(
                            soleIns=>{
                                return BuildSoleLayout(t, soleIns).then(
                                    ()=>{
                                        return BuildRooms(t, soleIns).then(
                                            rooms=>{
                                                return BuildRoomLayout(t, rooms);
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            });
        };

        MySQL.GeoLocation.findOne({
            where:{
                code: body.location.id
            },
            attributes:['id']
        }).then(
            geoLocation=>{
                if(!geoLocation){
                    return Transaction(body.location);
                }

                MySQL.Soles.count({
                    where:{
                        geoLocation: geoLocation.id
                    }
                }).then(
                    soleExists=>{
                        if(soleExists){
                            return reject(ErrorCode.ack(ErrorCode.DUPLICATEREQUEST));
                        }

                        Transaction(body.location).then(
                            ()=>{
                                resolve(ErrorCode.ack(ErrorCode.OK));
                            },
                            err=>{
                                log.error(err);
                                return reject(ErrorCode.ack(ErrorCode.DATABASEEXEC));
                            }
                        );
                    }
                );
            }
        );
    });
}
function GetShare(params, query) {
    return new Promise((resolve, reject)=>{
        const projectId = params.projectId;

        (async()=>{

            //
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
                let where = {
                    houseFormat: Typedef.HouseFormat.SHARE,
                    projectId: projectId,
                    geoLocation: {$in: geoLocationIds}
                };
                if(query.status){
                    where.status = query.status;
                }
                if(query.q){
                    where.$or = [
                        {roomNumber: {$regexp: new RegExp(query.q)}},
                        {code: {$regexp: new RegExp(query.q)}}
                    ];
                }
                const soles = await MySQL.Soles.findAll({
                    where: where,
                    attributes: ['id']
                });
                soles.map(sole=>{
                    soleIds.push(sole.id);
                });
            }

            if(query.bedRooms){
                const bedRooms = await MySQL.Layouts.findAll({
                    where:{
                        instanceId:{$in: soleIds},
                        bedRoom: query.bedRooms
                    },
                    attributes:['instanceId']
                });
                soleIds = [];
                bedRooms.map(r=>{
                    soleIds.push(r.instanceId);
                });
            }

            //paging
            const pagingInfo = Util.PagingInfo(query.index, query.size, true);
            MySQL.Soles.findAll({
                where:{
                    id:{$in: soleIds}
                },
                offset: pagingInfo.skip,
                limit: pagingInfo.size
            }).then(
                soles=>{
                    let soleIds = [];
                    let locationIds = [];
                    let soleMapping = {};
                    soles.map(sole=>{
                        sole.config;
                        soleMapping[sole.id] = MySQL.Plain(sole);
                        soleIds.push(sole.id);
                        locationIds.push(sole.geoLocation);
                    });

                    Promise.all([
                        MySQL.Layouts.findOne({
                            where:{
                                instanceId: {$in: soleIds}
                            }
                        }),
                        MySQL.GeoLocation.findAll({
                            where:{
                                id:{$in: locationIds}
                            }
                        }),
                        MySQL.Rooms.findAll({
                            where:{
                                soleId:{$in: soleIds}
                            }
                        })
                    ]).then(
                        result=>{
                            const layout = result[0];
                            const locations = result[1];
                            const rooms = result[2];

                            if(soleMapping[layout.instanceId]){
                                soleMapping[layout.instanceId].layout = layout;
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

                            rooms.map(room=>{
                                const soleId = room.soleId;
                                if(soleMapping[soleId]){
                                   if( !soleMapping[soleId].rooms ){
                                       soleMapping[soleId].rooms = [];
                                   }
                                   soleMapping[soleId].rooms.push(room);
                                }
                            });

                            resolve(ErrorCode.ack(ErrorCode.OK,
                                {
                                    paging:{
                                        count: soleIds.length,
                                        index: pagingInfo.index,
                                        size: pagingInfo.size
                                    },
                                    data: _.toArray(soleMapping)
                                }
                            ));
                        }
                    );
                },
                err=>{
                    log.error(err, soleIds);
                    reject(ErrorCode.ack(ErrorCode.DATABASEEXEC));
                }
            );


        })();
    });
}

module.exports = {
	/**
	 * summary: search houses
	 * description: pass hid or query parameter to get houese list

	 * parameters: hfmt, community, searchkey, status, division, rooms, floors, housetype, offset, limit
	 * produces: application/json
	 * responses: 200, 400
	 */
	get: function getHouse(req, res, next) {
		/**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
		const query = req.query;
		const params = req.params;

        if(!Util.ParameterCheck(query,
                ['houseFormat']
            )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }



        let promise;
        switch(query.houseFormat){
            case Typedef.HouseFormat.ENTIRE:
                promise = GetEntire(params, query);
                break;
            case Typedef.HouseFormat.SOLE:
                promise = GetSole(params, query);
                break;
            case Typedef.HouseFormat.SHARE:
                promise = GetShare(params, query);
                break;
        }

        if(!promise){
            return res.send(500, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
        }

        promise.then(
            resolve=>{
                res.send(resolve);
            },
            err=>{
                res.send(422, err)
            }
        );
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
                        ack = await SaveShare(t, param, body);
                        break;
                }

                await t.commit();
                res.send(ErrorCode.ack(ErrorCode.OK));
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
