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

function SaveEntire(params, body) {
	return new Promise((resolve, reject)=>{
        if(!Util.ParameterCheck(body,
                ['location', 'enabledFloors', 'roomCountOnFloor', 'totalFloor']
            )){
        	return reject(ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        if(!Util.ParameterCheck(body.location, ['id', 'divisionId', 'name', 'district', 'address', 'latitude', 'longitude'])){
            return reject(ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        const projectId = params.projectId;

        if(body.layout){
            const layoutLen = body.layout.length;
            for(let i =0; i<layoutLen; i++){
                const layout = body.layout[i];
                if(!Typedef.IsOrientation(layout.orientation)){
                    return reject(ErrorCode.ack(ErrorCode.PARAMETERERROR, {'orientation': layout}));
                }
            }
        }

        const now = moment();

        const BuildEntire = (t, location)=>{
            const entire = {
                id: SnowFlake.next(),
                projectId: projectId,
                geoLocation: location.id,
                totalFloor: body.totalFloor,
                roomCountOnFloor: body.roomCountOnFloor,
                enabledFloors: body.enabledFloors,
                createdAt: now.unix(),
                config: body.config
            };
            return MySQL.Entires.create(entire, {transaction: t, individualHooks: true});
        };
        const BuildEntireLayouts = (t, entireIns, layouts)=>{
            let bulkLayouts = [];
            layouts.map(layout=>{
                layout.id = SnowFlake.next(),
                    layout.instanceId = entireIns.id;
                bulkLayouts.push(layout);
            });
            return MySQL.Layouts.bulkCreate(bulkLayouts, {transaction: t});
        };

        const BuildLayouts = (items)=>{
            let layouts = [];
            items.map(item=>{
                layouts.push({
                    id: SnowFlake.next(),
                    instanceId: item.id,
                });
            });

            return layouts;
        };

        const BuildSoles = (t, entireIns)=>{
            let soles = [];
            const enabledFloors = body.enabledFloors.split(',');
            enabledFloors.map(floor=>{
                for(let i=1;i<=body.roomCountOnFloor;i++){
                    let roomNumber = '0' + i.toString();
                    roomNumber = roomNumber.substr(roomNumber.length-2);
                    roomNumber = floor + roomNumber;

                    soles.push({
                        id: SnowFlake.next(),
                        projectId: projectId,
                        houseFormat: Typedef.HouseFormat.ENTIRE,
                        geoLocation: entireIns.geoLocation,
                        entireId: entireIns.id,
                        roomNumber: roomNumber,
                        currentFloor: floor,
                        totalFloor: entireIns.totalFloor,
                        createAt: now.unix(),
                        status: Typedef.OperationStatus.IDLE,
                        config: entireIns.config,
                        houseKeeper: entireIns.houseKeeper
                    });
                }
            });
            return MySQL.Soles.bulkCreate(soles, {transaction: t, individualHooks: true});
        };

        const BuildRooms = (t, soles)=>{
            let rooms = [];
            soles.map(sole=>{
                rooms.push({
                    id: SnowFlake.next(),
                    projectId: projectId,
                    soleId: sole.id,
                    createAt: now.unix(),
                    status: Typedef.OperationStatus.IDLE,
                    config: sole.config
                });
            });

            return MySQL.Rooms.bulkCreate(rooms, {transaction: t, individualHooks: true});
        };

        const Transaction = async(location)=>{
            return MySQL.Sequelize.transaction(t=>{
                return common.UpsertGeoLocation(body.location, t).then(
                    location=> {
                        return BuildEntire(t, location[0]).then(
                            entireIns=>{
                                return BuildEntireLayouts(t, entireIns, body.layout).then(
                                    ()=>{
                                        return BuildSoles(t, entireIns).then(
                                            soles=>{
                                                // return BuildRooms(t, soles).then(
                                                //     rooms=>{
                                                // const layouts = _.unionWith(BuildLayouts(soles), BuildLayouts(rooms));
                                                const layouts = BuildLayouts(soles);
                                                return MySQL.Layouts.bulkCreate(layouts);
                                                //     }
                                                // );
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

                MySQL.Entires.count({
                    where:{
                        geoLocation: geoLocation.id
                    }
                }).then(
                    entireExists=>{
                        if(entireExists){
                            return reject(ErrorCode.ack(ErrorCode.DUPLICATEREQUEST));
                        }

                        Transaction(body.location).then(
                            ()=>{
                                resolve();
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
function GetEntire(params, query) {
	return new Promise((resolve, reject)=>{
        const projectId = params.projectId;
        const entireId = params.entireId;
        const query = query;

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

function SaveSole(params, body) {
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
                houseFormat: Typedef.HouseFormat.SOLE,
                code: body.code,
                geoLocation: location.id,
                group: body.group,
                building: body.building,
                unit: body.unit,
                roomNumber: body.roomNumber,
                currentFloor: body.currentFloor,
                totalFloor: body.totalFloor,
                createAt: now.unix(),
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

        const Transaction = async(location)=>{
            return MySQL.Sequelize.transaction(t=>{
                return common.UpsertGeoLocation(location, t).then(
                    location=> {
                        return BuildSoles(t, location[0]).then(
                            soleIns=>{
                                return BuildSoleLayout(t, soleIns);
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
                        MySQL.Layouts.findAll({
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
                            const layouts = result[0];
                            const locations = result[1];

                            layouts.map(layout=>{
                                if(soleMapping[layout.instanceId]){
                                    soleMapping[layout.instanceId].layout = layout;
                                }
                            });

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
                createAt: now.unix(),
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
                     createAt: now.unix(),
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
                        MySQL.Layouts.findAll({
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
                            const layouts = result[0];
                            const locations = result[1];
                            const rooms = result[2];

                            layouts.map(layout=>{
                                if(soleMapping[layout.instanceId]){
                                    soleMapping[layout.instanceId].layout = layout;
                                }
                            });

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
	post: function saveHouse(req, res) {
		/**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
        const params = req.params;
		const body = req.body;
		if(!Util.ParameterCheck(body,
				['houseFormat']
			)){
		    return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
		}

		let promise;
		switch(body.houseFormat){
			case Typedef.HouseFormat.ENTIRE:
				promise = SaveEntire(params, body);
				break;
			case Typedef.HouseFormat.SOLE:
				promise = SaveSole(params, body);
				break;
            case Typedef.HouseFormat.SHARE:
                promise = SaveShare(params, body);
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
    }
};
