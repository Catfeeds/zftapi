'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
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
    && (fp.isObject(body.layout) && !fp.isArray(body.layout));
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

                const status = fp.includes(currentFloor)(body.enabledFloors) ? Typedef.HouseStatus.OPEN : Typedef.HouseStatus.CLOSED;

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
            name: fp.uniqueId('room'),
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
    const districtLocation = ()=>{
        if(query.locationId){
            // geoLocationIds = [query.locationId];
            return {'$building.location.id$': query.locationId};
        }
        else if(query.districtId){
            if(Util.IsParentDivision(query.districtId)){
                return {
                    '$building.location.divisionId$': {$regexp: Util.ParentDivision(query.districtId)}
                };
            }
            else{
                return {
                    '$building.location.divisionId$': query.districtId
                };
            }
        }
    };

    const pagingInfo = Util.PagingInfo(query.index, query.size, true);
    try {
        const where = fp.extendAll([
            {projectId: projectId},
            {
                status: {$ne: Typedef.HouseStatus.DELETED},
            },
            query.buildingId ? {'$building.id$': query.buildingId} : {},
            districtLocation() || {},
            query.houseFormat ? {houseFormat: query.houseFormat} : {},
            query.layoutId ? {'layoutId': query.layoutId} : {},
            query.floor ? {'currentFloor': query.floor} : {},
            query.q ? {
                $or: [
                    {'$building.location.name$': {$regexp: query.q}},
                    {roomNumber: {$regexp: query.q}},
                    {code: {$regexp: query.q}},
                    {'$rooms.contract.user.name': {$regexp: query.q}},
                    {'$rooms.contract.user.mobile': {$regexp: query.q}},
                ],
            } : {},
            query.bedRooms ? {'$layouts.bedRoom$': query.bedRooms} : {},
            query.device ? await deviceFilter() : {},
        ]);

        const includeBuilding = ()=>{
            return {
                model: MySQL.Building, as: 'building'
                , include:[{
                    model: MySQL.GeoLocation
                    , as: 'location'
                    // , order:[['divisionId', 'ASC'], ['name', 'ASC']],
                }]
                , attributes: ['group', 'building', 'unit'],
            };
        };
        const includeLayouts = () => {
            return {
                model: MySQL.Layouts,
                as: 'layouts',
                attributes: ['name', 'bedRoom', 'livingRoom', 'bathRoom', 'orientation', 'roomArea', 'remark'],
            };
        };
        const includeHouseDevicePrice = ()=>{
            return {
                model: MySQL.HouseDevicePrice,
                as: 'prices',
                required: false,
                where:{
                    endDate: 0
                }
            };
        };

        const getInclude = async(forPaging)=>{
            return [
                includeBuilding(),
                includeLayouts(),
                await common.includeRoom(query.status, forPaging),
                common.includeHouseDevices(true),
                includeHouseDevicePrice()
            ];
        };


        const count = await MySQL.Houses.count({
            where: where,
            subQuery: false,
            include: await getInclude(),
            distinct: true,
            attributes:['id']
        });
        const rows = await MySQL.Houses.findAll({
            where: where,
            // subQuery: false,
            include: await getInclude(),
            order:[
                ['building', 'location', 'divisionId', 'ASC']
                , ['building', 'location',  'name', 'ASC']
                , ['roomNumber', 'ASC']
            ],
            offset: pagingInfo.skip,
            limit: pagingInfo.size
        });

        //
        const houses = fp.map(row=>{
            const house = row.toJSON();

            return {
                houseId: house.id,
                houseFormat: house.houseFormat,
                code: house.code,
                group: house.building.group,
                building: house.building.building,
                location: house.building.location,
                unit: house.building.unit,
                roomNumber: house.roomNumber,
                currentFloor: house.currentFloor,
                rooms: common.translateRooms(house.rooms),
                layout: house.layouts,
                houseKeeper: house.houseKeeper,
                devices: common.translateDevices(house.devices),
                prices: fp.map(fp.pick(['category', 'type', 'price']))(house.prices)
            };

        })(rows);

        return {
            paging:{
                count: count,
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
    get: async (req, res) => {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        const query = req.query;
        const params = req.params;

        if (!Util.ParameterCheck(query,
            ['houseFormat'],
        )) {
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED,
                {error: 'missing query params houseFormat'}));
        }

        try {
            let result = await Gethouses(params, query);
            res.send(result);
        }
        catch (e) {
            log.error(e, query, params);
            res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        }
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

            const projectId = params.projectId;

            if(!Util.ParameterCheck(body,
                ['houseFormat']
            )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, {error: 'missing query params houseFormat'}));
            }

            if(!Util.ParameterCheck(body.location, ['divisionId', 'name'])){
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
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, {error: 'location/roomNumber/currentFloor/totalFloor/layout check failed'}));
            }


            const isRoomNumberExists = async()=>{
                try {
                    const count = await MySQL.Houses.count({
                        where: {
                            roomNumber: body.roomNumber,
                            projectId: projectId,
                        },
                        include: [
                            {
                                model: MySQL.Building,
                                as: 'building',
                                where: fp.extendAll([
                                    {}
                                    , body.group ? {group: body.group} : {}
                                    , body.building ? {building: body.building} : {}
                                    , body.unit ? {unit: body.unit} : {}
                                ]),
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
            const isCodeExists = async(code)=>{
                try{
                    const count = await MySQL.Houses.count({
                        where:{
                            projectId: projectId,
                            code: code
                        }
                    });
                    return count > 0;
                }
                catch (e){
                    log.error(e);
                    return true;
                }
            };

            const houseFormat = body.houseFormat;
            if (fp.includes(houseFormat)(
                [Typedef.HouseFormat.SOLE, Typedef.HouseFormat.SHARE])) {
                const houseCount = await isRoomNumberExists();
                if (houseCount) {
                    return res.send(403, ErrorCode.ack(ErrorCode.HOUSEEXISTS));
                }
            }

            if(await isCodeExists(body.code)){
                return res.send(403, ErrorCode.ack(ErrorCode.HOUSECODEEXISTS));
            }


            let t;
            try{
                t = await MySQL.Sequelize.transaction({autocommit: false});

                const createLocation = async()=>{
                    if(body.location.code){
                        const location = await MySQL.GeoLocation.findOne({
                            where:{
                                code: body.location.code
                            },
                            attributes:['id']
                        });


                        if(!location){
                            // await SaveHouses(params, body, location.id);
                            const newLocation = await common.AsyncUpsertGeoLocation(body.location, t);
                            body.location = MySQL.Plain( newLocation[0] );
                        }
                        else{
                            body.location.id = location.id;
                        }
                    }
                    else{
                        const newLocation = await MySQL.GeoLocation.create(common.assignNewId({

                            divisionId: body.location.divisionId
                            , name: body.location.name
                        }), {transaction: t});
                        body.location = newLocation;
                    }
                };


                await createLocation();

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
                    res.send(body);
                }
            }
            catch(e){
                await t.rollback();
                log.error(e);
                res.send(422, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        })();
    }
};
