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
            ['location', 'enabledFloors', 'houseCountOnFloor', 'totalFloor']
        );
}
function SoleCheck(body) {
    return Util.ParameterCheck(body,
            ['location', 'roomNumber', 'currentFloor', 'totalFloor']
        )
    && (_.isObject(body.layout) && !_.isArray(body.layout));
}
function ShareCheck(body) {
    return Util.ParameterCheck(body,
        ['location', 'roomNumber', 'currentFloor', 'totalFloor']
    )
    && (_.isObject(body.layout) && !_.isArray(body.layout));
}



async function SaveEntire(t, params, body){
    const projectId = params.projectId;
    const createdAt = moment().unix();

    const createHouses = (buildingId, houseCountOnFloor, totalFloor)=>{
        let houses = [];
        let rooms = [];
        let layouts = [];

        let currentFloor = 1;

        while(currentFloor<=totalFloor){
            let i = 1;
            while(i<=houseCountOnFloor){
                let roomNumber = '0' + i.toString();
                roomNumber = roomNumber.substr(roomNumber.length-2);
                roomNumber = currentFloor + roomNumber;

                const status = _.indexOf(body.enabledFloors, currentFloor) === -1 ? Typedef.HouseStatus.CLOSED : Typedef.HouseStatus.OPEN;

                const houseId = SnowFlake.next();
                const house = {
                    id: houseId,
                    houseFormat: Typedef.HouseFormat.ENTIRE,
                    projectId: projectId,
                    buildingId: buildingId,
                    code: body.code,
                    roomNumber: roomNumber,
                    currentFloor: currentFloor,
                    houseKeeper: body.houseKeeper,
                    status: status,
                    createdAt: createdAt
                };

                layouts.push({
                    id: SnowFlake.next(),
                    sourceId: houseId,
                    createdAt: createdAt
                });
                houses.push(house);

                rooms.push({
                    id: SnowFlake.next(),
                    houseId: house.id,
                    status: Typedef.OperationStatus.IDLE,
                    createdAt: createdAt
                });


                i++;
            }
            currentFloor++;
        }

        return {
            houses: houses,
            layouts: layouts,
            rooms: rooms
        };
    };

    try{
        const buildingId = SnowFlake.next();
        body.layouts && body.layouts.map(layout=>{
            layout.id = SnowFlake.next();
            layout.sourceId = buildingId;
            layout.createdAt = createdAt;
        });
        const buildingIns = {
            id: buildingId,
            projectId: projectId,
            locationId: body.location.id,
            totalFloor: body.totalFloor,
            houseCountOnFloor: body.houseCountOnFloor || body.roomCountOnFloor,
            config: body.config,
            Layouts: body.layouts || [],
            createdAt: createdAt
        };

        await MySQL.Building.create(buildingIns, {transaction: t, include:[{model: MySQL.Layouts, as: 'Layouts'}]});

        const houseRoomLayouts = createHouses(buildingId, buildingIns.houseCountOnFloor, buildingIns.totalFloor);

        await MySQL.Houses.bulkCreate(houseRoomLayouts.houses, {transaction: t});
        await MySQL.Rooms.bulkCreate(houseRoomLayouts.rooms, {transaction: t});
        await MySQL.Layouts.bulkCreate(houseRoomLayouts.layouts, {transaction: t});
    }
    catch(e){
        log.error(e);
        throw Error(ErrorCode.DATABASEEXEC);
    }
}
async function GetEntire(params, query) {
    const projectId = params.projectId;

    /*
    * buildingId/houseStatus/roomStatus/layoutId/floor/q/bedRoom
    * */
    const buildingId = query.buildingId;

    const where = _.assignIn({},
        query.buildingId ? {'$Building.id$': query.buildingId} : {},
        query.houseFormat ? {houseFormat: query.houseFormat} : {},
        query.houseStatus ? { 'status': query.houseStatus } : {},
        query.roomStatus ? {'$Rooms.status$': query.roomStatus }: {},
        query.layoutId ? {'layoutId': query.layoutId}: {},
        query.floor ? {'currentFloor': query.floor}: {},
        query.q ? {$or: [
            {roomNumber: {$regexp: query.q}},
            {code: {$regexp: query.q}},
        ]} : {},
        query.bedRoom ? {'$Layouts.bedRoom$': query.bedRoom} : {}
    );

    const pagingInfo = Util.PagingInfo(query.index, query.size, true);
    try {
        const count = await MySQL.Houses.count({
            where: where,
            include: [
                {
                    model: MySQL.Building, as: 'Building'
                    , include:[{
                        model: MySQL.GeoLocation, as: 'Location'
                    }]
                },
                {model: MySQL.Layouts, as: 'Layouts'},
                {model: MySQL.Rooms, as: 'Rooms'}
            ]
        });

        const result = await MySQL.Houses.findAll({
            where: where,
            subQuery: false,
            include: [
                {
                    model: MySQL.Building, as: 'Building'
                    , include:[{
                        model: MySQL.GeoLocation, as: 'Location'
                    }]
                    , attributes: ['group', 'building', 'unit']
                },
                {model: MySQL.Layouts, as: 'Layouts', attributes: ["name","bedRoom", "livingRoom", "bathRoom", "orientation", "roomArea", "remark"]},
                {model: MySQL.Rooms, as: 'Rooms', attributes:['config', 'name', 'people', 'type', 'roomArea', 'orientation']}
            ],
            offset: pagingInfo.skip,
            limit: pagingInfo.size
        });

        let data = [];
        result.map(r=>{
            data.push({
                houseId: r.id,
                code: r.code,
                group: r.Building.group,
                building: r.Building.building,
                unit: r.Building.unit,
                roomNumber: r.roomNumber,
                rooms: r.Rooms,
                layout: r.Layouts
            });
        });

        return {
            paging:{
                count: count,
                index: pagingInfo.index,
                size: pagingInfo.size
            },
            data: data
        };
    }
    catch(e){
        log.error(e);
        throw Error(ErrorCode.DATABASEEXEC);
    }
}

async function SaveSole(t, params, body) {
    const projectId = params.projectId;

    const createdAt = moment().unix();

    const createHouse = (buildingId)=>{
        const houseId = SnowFlake.next();
        const house = {
            id: houseId,
            houseFormat: body.houseFormat,
            projectId: projectId,
            buildingId: buildingId,
            code: body.code,
            roomNumber: body.roomNumber,
            currentFloor: body.currentFloor,
            houseKeeper: body.houseKeeper,
            status: Typedef.HouseStatus.OPEN,
            config: body.config,
            createdAt: createdAt
        };

        const layout = {
            id: SnowFlake.next(),
            sourceId: houseId,
            bedRoom: body.layout.bedRoom,
            livingRoom: body.layout.livingRoom,
            bathRoom: body.layout.bathRoom,
            orientation: body.layout.orientation,
            roomArea: body.layout.roomArea,
            createdAt: createdAt,
        };

        const room = {
            id: SnowFlake.next(),
            houseId: house.id,
            roomArea: body.roomArea,
            status: Typedef.OperationStatus.IDLE,
            createdAt: createdAt
        };

        return {
            house: house,
            layout: layout,
            room: room
        }
    };

    try{
        const buildingId = SnowFlake.next();
        const buildingIns = {
            id: buildingId,
            projectId: projectId,
            group: body.group,
            building: body.building,
            unit: body.unit,
            locationId: body.location.id,
            totalFloor: body.totalFloor,
            config: body.config,
            createdAt: createdAt
        };

        await MySQL.Building.create(buildingIns, {transaction: t, include:[{model: MySQL.Layouts, as: 'Layouts'}]});

        const houseRoomLayout = createHouse(buildingId);

        await MySQL.Houses.create(houseRoomLayout.house, {transaction: t});
        await MySQL.Rooms.create(houseRoomLayout.room, {transaction: t});
        await MySQL.Layouts.create(houseRoomLayout.layout, {transaction: t});
    }
    catch(e){
        log.error(e);
        throw Error(ErrorCode.DATABASEEXEC);
    }
}
async function GetSole(params, query) {
    const projectId = params.projectId;

    /*
    * divisionId/geoLocationId/q/houseStatus/roomStatus/bedRoom
    * */
    const buildingId = query.buildingId;

    const divisionLocation = ()=>{
        if(query.locationId){
            // geoLocationIds = [query.locationId];
            return {'$Building.Location.id$': query.locationId};
        }
        else if(query.divisionId){
            let where = {};
            if(Util.IsParentDivision(query.divisionId)){
                return {
                    '$Building.Location.divisionId': {$regexp: Util.ParentDivision(query.divisionId)}
                };
            }
            else{
                return {
                    '$Building.Location.divisionId': query.divisionId
                };
            }
        }
    };

    const where = _.assignIn({projectId: projectId},
        query.houseFormat ? {houseFormat: query.houseFormat} : {},
        divisionLocation() && {},
        query.houseStatus ? { 'status': query.houseStatus } : {},
        query.roomStatus ? {'$Rooms.status$': query.roomStatus }: {},
        query.q ? {$or: [
            {'$Building.Location.name$': {$regexp: query.q}},
            {roomNumber: {$regexp: query.q}},
            {code: {$regexp: query.q}},
        ]} : {},
        query.bedRoom ? {'$Layouts.bedRoom$': query.bedRoom} : {}
    );

    const pagingInfo = Util.PagingInfo(query.index, query.size, true);
    try {
        const count = await MySQL.Houses.count({
            where: where,
            include: [
                {
                    model: MySQL.Building, as: 'Building'
                    , include:[{
                        model: MySQL.GeoLocation, as: 'Location'
                    }]
                },
                {model: MySQL.Layouts, as: 'Layouts'},
                {model: MySQL.Rooms, as: 'Rooms'}
            ]
        });

        const result = await MySQL.Houses.findAll({
            where: where,
            subQuery: false,
            include: [
                {
                    model: MySQL.Building, as: 'Building'
                    , include:[{
                    model: MySQL.GeoLocation, as: 'Location'
                }]
                    , attributes: ['group', 'building', 'unit']
                },
                {model: MySQL.Layouts, as: 'Layouts', attributes: ["name","bedRoom", "livingRoom", "bathRoom", "orientation", "roomArea", "remark"]},
                {model: MySQL.Rooms, as: 'Rooms', attributes:['id', 'config', 'name', 'people', 'type', 'roomArea', 'orientation']}
            ],
            offset: pagingInfo.skip,
            limit: pagingInfo.size
        });

        let data = [];
        result.map(r=>{
            data.push({
                houseId: r.id,
                code: r.code,
                group: r.Building.group,
                building: r.Building.building,
                unit: r.Building.unit,
                roomNumber: r.roomNumber,
                rooms: r.Rooms,
                layout: r.Layouts
            });
        });

        return {
            paging:{
                count: count,
                index: pagingInfo.index,
                size: pagingInfo.size
            },
            data: data
        };
    }
    catch(e){
        log.error(e);
        throw Error(ErrorCode.DATABASEEXEC);
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

    const createdAt = moment().unix();

    const createHouse = (buildingId)=>{
        const houseId = SnowFlake.next();
        const house = {
            id: houseId,
            houseFormat: body.houseFormat,
            projectId: projectId,
            buildingId: buildingId,
            code: body.code,
            roomNumber: body.roomNumber,
            currentFloor: body.currentFloor,
            houseKeeper: body.houseKeeper,
            status: Typedef.HouseStatus.OPEN,
            config: body.config,
            createdAt: createdAt
        };

        const layout = {
            id: SnowFlake.next(),
            sourceId: houseId,
            bedRoom: body.layout.bedRoom,
            livingRoom: body.layout.livingRoom,
            bathRoom: body.layout.bathRoom,
            orientation: body.layout.orientation,
            roomArea: body.layout.roomArea,
            createdAt: createdAt,
        };

        let nowRoom = 1;
        let rooms = [];
        while(nowRoom <= body.layout.bedRoom){
            rooms.push({
                id: SnowFlake.next(),
                name: nowRoom.toString(),
                houseId: house.id,
                status: Typedef.OperationStatus.IDLE,
                createdAt: createdAt
            });

            nowRoom++;
        }

        return {
            house: house,
            layout: layout,
            rooms: rooms
        }
    };

    try{
        const buildingId = SnowFlake.next();
        const buildingIns = {
            id: buildingId,
            projectId: projectId,
            group: body.group,
            building: body.building,
            unit: body.unit,
            locationId: body.location.id,
            totalFloor: body.totalFloor,
            config: body.config,
            createdAt: createdAt
        };

        await MySQL.Building.create(buildingIns, {transaction: t, include:[{model: MySQL.Layouts, as: 'Layouts'}]});

        const houseRoomLayout = createHouse(buildingId);

        await MySQL.Houses.create(houseRoomLayout.house, {transaction: t});
        await MySQL.Rooms.bulkCreate(houseRoomLayout.rooms, {transaction: t});
        await MySQL.Layouts.create(houseRoomLayout.layout, {transaction: t});
    }
    catch(e){
        log.error(e);
        throw Error(ErrorCode.DATABASEEXEC);
    }
}
async function GetShare(params, query) {
    const projectId = params.projectId;

    /*
    * divisionId/geoLocationId/q/houseStatus/roomStatus/bedRoom
    * */
    const divisionLocation = ()=>{
        if(query.locationId){
            // geoLocationIds = [query.locationId];
            return {'$Building.Location.id$': query.locationId};
        }
        else if(query.divisionId){
            let where = {};
            if(Util.IsParentDivision(query.divisionId)){
                return {
                    '$Building.Location.divisionId': {$regexp: Util.ParentDivision(query.divisionId)}
                };
            }
            else{
                return {
                    '$Building.Location.divisionId': query.divisionId
                };
            }
        }
    };

    const where = _.assignIn({},
        query.houseFormat ? {houseFormat: query.houseFormat} : {},
        divisionLocation() && {},
        query.houseStatus ? { 'status': query.houseStatus } : {},
        query.roomStatus ? {'$Rooms.status$': query.roomStatus }: {},
        query.q ? {$or: [
            {'$Building.Location.name$': {$regexp: query.q}},
            {roomNumber: {$regexp: query.q}},
            {code: {$regexp: query.q}},
        ]} : {},
        query.bedRoom ? {'$Layouts.bedRoom$': query.bedRoom} : {}
    );

    const pagingInfo = Util.PagingInfo(query.index, query.size, true);
    try {
        const count = await MySQL.Houses.count({
            where: where,
            include: [
                {
                    model: MySQL.Building, as: 'Building'
                    , include:[{
                        model: MySQL.GeoLocation, as: 'Location'
                    }]
                },
                {model: MySQL.Layouts, as: 'Layouts'},
                {model: MySQL.Rooms, as: 'Rooms'}
            ]
        });

        const result = await MySQL.Houses.findAll({
            where: where,
            subQuery: false,
            include: [
                {
                    model: MySQL.Building, as: 'Building'
                    , include:[{
                        model: MySQL.GeoLocation, as: 'Location'
                    }]
                },
                {model: MySQL.Layouts, as: 'Layouts', attributes: ["name","bedRoom", "livingRoom", "bathRoom", "orientation", "roomArea", "remark"]},
                {model: MySQL.Rooms, as: 'Rooms', attributes:['id', 'config', 'name', 'people', 'type', 'roomArea', 'orientation']}
            ],
            offset: pagingInfo.skip,
            limit: pagingInfo.size
        });

        let data = [];
        result.map(r=>{
            data.push({
                houseId: r.id,
                code: r.code,
                group: r.Building.group,
                building: r.Building.building,
                unit: r.Building.unit,
                roomNumber: r.roomNumber,
                rooms: r.Rooms,
                layout: r.Layouts
            });
        });

        return {
            paging:{
                count: count,
                index: pagingInfo.index,
                size: pagingInfo.size
            },
            data: data
        };
    }
    catch(e){
        log.error(e);
        throw Error(ErrorCode.DATABASEEXEC);
    }
}

module.exports = {
	/**
	 * summary: search houses
	 * description: pass hid or query parameter to get house list

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

            if(!Util.ParameterCheck(body.location, ['code', 'divisionId', 'name', 'district', 'address', 'latitude', 'longitude'])){
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
                else{
                    body.location.id = location.id;
                }
                // else {
                //
                //     const entireExists = await MySQL.Houses.count({
                //         where: {
                //             geoLocation: location.id
                //         }
                //     });
                //
                //     if (entireExists) {
                //         return res.send(400, ErrorCode.ack(ErrorCode.DUPLICATEREQUEST));
                //     }
                // }

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
