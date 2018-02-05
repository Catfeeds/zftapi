'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
const _ = require('lodash');
const moment = require('moment');
const common = Include('/services/v1.0/common');

function EntireCheck(body) {
    return Util.ParameterCheck(body,
        ['location', 'enabledFloors', 'houseCountOnFloor', 'totalFloor']
    );
}
function SoleShareCheck(body) {
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
            layouts: body.layouts || [],
            createdAt: createdAt
        };

        await MySQL.Building.create(buildingIns, {transaction: t, include:[{model: MySQL.Layouts, as: 'layouts'}]});

        const houseRoomLayouts = createHouses(buildingId, buildingIns.houseCountOnFloor, buildingIns.totalFloor);

        await MySQL.Houses.bulkCreate(houseRoomLayouts.houses, {transaction: t});
        await MySQL.Rooms.bulkCreate(houseRoomLayouts.rooms, {transaction: t});
        await MySQL.Layouts.bulkCreate(houseRoomLayouts.layouts, {transaction: t});

        return ErrorCode.ack(ErrorCode.OK);
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
        const roomId = SnowFlake.next();
        const room = {
            id: roomId,
            name: _.uniqueId('room'),
            houseId: house.id,
            roomArea: body.roomArea,
            status: Typedef.OperationStatus.IDLE,
            createdAt: createdAt
        };

        return {
            house: house,
            layout: layout,
            room: room
        };
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

        await MySQL.Building.create(buildingIns, {transaction: t, include:[{model: MySQL.Layouts, as: 'layouts'}]});

        const houseRoomLayout = createHouse(buildingId);

        await MySQL.Houses.create(houseRoomLayout.house, {transaction: t});
        await MySQL.Rooms.create(houseRoomLayout.room, {transaction: t});
        await MySQL.Layouts.create(houseRoomLayout.layout, {transaction: t});

        return ErrorCode.ack(ErrorCode.OK);
    }
    catch(e){
        log.error(e);
        throw Error(ErrorCode.DATABASEEXEC);
    }
}
async function SaveShare(t, params, body) {

    const projectId = params.projectId;

    if(body.layout){
        if(!Typedef.IsOrientation(body.layout.orientation)){
            return ErrorCode.ack(ErrorCode.PARAMETERERROR, {'orientation': body.layout, message: 'missed orientation'});
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
        };
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

        await MySQL.Building.create(buildingIns, {transaction: t, include:[{model: MySQL.Layouts, as: 'layouts'}]});

        const houseRoomLayout = createHouse(buildingId);

        await MySQL.Houses.create(houseRoomLayout.house, {transaction: t});
        await MySQL.Rooms.bulkCreate(houseRoomLayout.rooms, {transaction: t});
        await MySQL.Layouts.create(houseRoomLayout.layout, {transaction: t});

        return ErrorCode.ack(ErrorCode.OK);
    }
    catch(e){
        log.error(e);
        throw Error(ErrorCode.DATABASEEXEC);
    }
}

async function Gethouses(params, query) {
    const projectId = params.projectId;

    /*
    * buildingId/houseStatus/roomStatus/layoutId/floor/q/bedRoom
    * */
    const deviceFilter = async()=>{
        if(query.device){
            try {
                const sourceIds = fp.map(item => {
                    return item.sourceId;
                })(await MySQL.HouseDevices.findAll({
                    where: {
                        projectId: projectId,
                        endDate: 0
                    },
                    attributes: ['sourceId']
                }));
                if (query.device === 'BIND') {
                    //
                    return {
                        $or: [
                            {'id': {$in: sourceIds}},
                            {'$rooms.id$': {$in: sourceIds}},
                        ]
                    };
                }
                else if (query.device === 'FREE') {
                    return {
                        $or: [
                            {'id': {$notIn: sourceIds}},
                            {'$rooms.id$': {$notIn: sourceIds}},
                        ]
                    };
                }
                else{
                    return {};
                }
            }
            catch(e){
                log.error(e, params, query);
                throw Error(ErrorCode.DATABASEEXEC);
            }
        }
        else{
            return {};
        }
    };
    const divisionLocation = ()=>{
        if(query.locationId){
            // geoLocationIds = [query.locationId];
            return {'$building.location.id$': query.locationId};
        }
        else if(query.divisionId){
            if(Util.IsParentDivision(query.divisionId)){
                return {
                    '$building.location.divisionId': {$regexp: Util.ParentDivision(query.divisionId)}
                };
            }
            else{
                return {
                    '$building.location.divisionId': query.divisionId
                };
            }
        }
    };

    const pagingInfo = Util.PagingInfo(query.index, query.size, true);
    try {
        const where = _.assignIn({
            status:{$ne: Typedef.HouseStatus.DELETED}
        },
        query.buildingId ? {'$building.id$': query.buildingId} : {},
        divisionLocation() || {},
        query.houseFormat ? {houseFormat: query.houseFormat} : {},
        query.layoutId ? {'layoutId': query.layoutId}: {},
        query.floor ? {'currentFloor': query.floor}: {},
        query.q ? {$or: [
            {'$building.location.name$': {$regexp: query.q}},
            {roomNumber: {$regexp: query.q}},
            {code: {$regexp: query.q}},
        ]} : {},
        query.bedRooms ? {'$layouts.bedRoom$': query.bedRooms} : {},
        query.device ? await deviceFilter() : {},
        );

        const contractOptions = async()=> {
            switch (query.status) {
            case 'ONGOING': {
                return {
                    where: {
                        status: Typedef.ContractStatus.ONGOING
                    },
                    required: true
                };
            }
            case 'EXPIRED': {
                return {
                    where: {
                        status: Typedef.ContractStatus.ONGOING,
                        to: {$lte: moment().unix()}
                    },
                    required: true
                };
            }
            }
        };

        const getIncludeHouseDevices =(isPublic)=>{
            return {
                model: MySQL.HouseDevices,
                as: 'devices',
                required: false,
                attributes: ['deviceId', 'public'],
                where:{
                    endDate: 0,
                    public: isPublic
                },
                include:[
                    {
                        model: MySQL.Devices,
                        as: 'device',
                        include:[
                            {
                                model: MySQL.DevicesChannels,
                                as: 'channels'
                            }
                        ]
                    }
                ]
            };
        };
        const getIncludeRoom = async()=>{

            const getWhere = async()=>{
                if(query.status === 'IDLE'){
                    const contracts = await MySQL.Contracts.findAll({
                        where:{
                            projectId: projectId,
                            status: Typedef.ContractStatus.ONGOING
                        },
                        attributes: ['roomId']
                    });
                    const roomIds = fp.map(contract=>{return contract.roomId;})(contracts);
                    return {
                        where:{
                            id: {
                                $notIn: roomIds
                            }
                        }
                    };
                }
                else if(query.status === 'CLOSED' ){
                    const suspendings = await MySQL.SuspendingRooms.findAll({
                        where:{
                            to: 0
                        },
                        attributes: ['roomId']
                    });
                    const roomIds = fp.map(suspending=>{return suspending.roomId;})(suspendings);
                    return {
                        where:{
                            id: {
                                in: roomIds
                            }
                        }
                    };
                }
                else{
                    return null;
                }
            };

            const where = await getWhere();

            return _.assign(
                {
                    model: MySQL.Rooms,
                    as: 'rooms',
                    attributes:['id', 'config', 'name', 'people', 'type', 'roomArea', 'orientation'],
                    required: true,
                    include:[
                        getIncludeHouseDevices(false),
                        _.assign({
                            model: MySQL.Contracts,
                            required: false,
                            where:{

                                status: Typedef.ContractStatus.ONGOING
                            },
                            order:['from asc'],
                            include:[
                                {
                                    model: MySQL.Users
                                }
                            ]
                        }, await contractOptions()),
                        {
                            model: MySQL.SuspendingRooms,
                            required: false,
                            where:{
                                to: {
                                    $eq: null
                                }
                            },
                            attributes: ['id','from','to','memo']
                        }
                    ]
                },
                where ? where : {}
            );
        };
        const include = [
            {
                model: MySQL.Building, as: 'building'
                , include:[{
                    model: MySQL.GeoLocation, as: 'location',
                }]
                , attributes: ['group', 'building', 'unit'],
            },
            {
                model: MySQL.Layouts,
                as: 'layouts',
                attributes: ['name', 'bedRoom', 'livingRoom', 'bathRoom', 'orientation', 'roomArea', 'remark'],
            },
            await getIncludeRoom(),
            getIncludeHouseDevices(true),
            {
                model: MySQL.HouseDevicePrice,
                as: 'prices',
                where:{
                    expiredDate: 0
                }
            }
        ];

        const result = await MySQL.Houses.findAndCountAll({
            where: where,
            subQuery: false,
            include: include,
            offset: pagingInfo.skip,
            limit: pagingInfo.size
        });

        //
        const houses = fp.map(row=>{
            const house = row.toJSON();

            const getDevices = (devices)=>{
                return _.compact(fp.map(device=>{
                    if(!device || !device.device){
                        return null;
                    }
                    else {
                        return {
                            deviceId: device.device.deviceId,
                            public: device.public,
                            title: device.device.name,
                            // scale: fp.map(channel=>{
                            //     return {
                            //         channelId: channel.channelId,
                            //         scale: common.scaleDown(channel.scale)
                            //     }
                            // })(device.device.channels),
                            scale: device.device.channels && common.scaleDown(device.device.channels[0].scale),
                            type: device.device.type,
                            updatedAt: moment(device.device.updatedAt).unix(),
                            status: common.deviceStatus(device.device)
                        };
                    }
                })(devices));
            };

            const rooms = fp.map(room=>{
                const getContract = ()=>{
                    if( !room.contracts || !room.contracts.length ){
                        return {};
                    }
                    else{
                        const contract = room.contracts[0];
                        return {
                            id: contract.id,
                            from: contract.from,
                            to: contract.to,
                            userId: contract.user.id,
                            name: contract.user.name,
                            rent: _.get(contract, 'strategy.freq.rent')
                        };
                    }
                };
                const getSuspending = ()=>{
                    if( !room.suspendingRooms || !room.suspendingRooms.length ){
                        return {};
                    }
                    else{
                        return room.suspendingRooms[0];
                    }
                };
                const devices = getDevices(room.devices);

                return _.assignIn( _.omit(room, ['contracts','devices']), {
                    contract: getContract()
                    , suspending: getSuspending()
                    , devices: devices
                    , status: common.roomLeasingStatus(room.contracts, room.suspendingRooms)}
                );

            })(house.rooms);

            return {
                houseId: house.id,
                code: house.code,
                group: house.building.group,
                building: house.building.building,
                location: house.building.location,
                unit: house.building.unit,
                roomNumber: house.roomNumber,
                currentFloor: house.currentFloor,
                rooms: rooms,
                layout: house.layouts,
                devices: getDevices(house.devices),
                prices: fp.map(fp.pick(['category', 'type', 'price']))(house.prices)
            };

        })(result.rows);

        return {
            paging:{
                count: result.count,
                index: pagingInfo.index,
                size: pagingInfo.size
            },
            data: houses
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
    get: (req, res)=>{
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
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, {error: 'missing query params houseFormat'}));
            }

            try {
                let result = await Gethouses(params, query);
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
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, {error: 'missing query params houseFormat'}));
            }

            if(!Util.ParameterCheck(body.location, ['code', 'divisionId', 'name', 'district', 'address', 'latitude', 'longitude'])){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, {error: 'please check fields in query params location', location: body.location}));
            }

            let formatPassed = false;
            switch(body.houseFormat){
            case Typedef.HouseFormat.ENTIRE:
                formatPassed = EntireCheck(body);
                break;
            case Typedef.HouseFormat.SOLE:
            case Typedef.HouseFormat.SHARE:
                formatPassed = SoleShareCheck(body);
                break;
            }
            if(!formatPassed){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, {error: 'houseFormat check failed', houseFormat: body.houseFormat}));
            }


            const isExists = async()=>{
                try {
                    const count = await MySQL.Houses.count({
                        where: {
                            roomNumber: body.roomNumber
                        },
                        include: [
                            {
                                model: MySQL.Building,
                                as: 'building',
                                where: _.assign(
                                    {}
                                    , body.group ? {group: body.group} : {}
                                    , body.building ? {building: body.building} : {}
                                    , body.unit ? {unit: body.unit} : {}
                                ),
                                include: [
                                    {
                                        model: MySQL.GeoLocation,
                                        as: 'location',
                                        where: {
                                            code: body.location.code
                                        }
                                    }
                                ]
                            }
                        ]
                    });
                    return count;
                }
                catch(e){
                    log.error(e);
                }
            };

            const houseFormat = body.houseFormat;
            if(_.includes([Typedef.HouseFormat.SOLE, Typedef.HouseFormat.SHARE], houseFormat)){
                const houseCount = await isExists();
                if(houseCount){
                    return res.send(403, ErrorCode.ack(ErrorCode.HOUSEEXISTS));
                }
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

                if(ack.code !== ErrorCode.OK){
                    await t.rollback();
                    res.send(ack);
                }
                else {
                    await t.commit();
                    res.send();
                }
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
