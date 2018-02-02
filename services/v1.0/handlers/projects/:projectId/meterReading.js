'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
const _ = require('lodash');
const moment = require('moment');
const common = Include('/services/v1.0/common');

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
    get: (req, res)=>{
        /**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
        (async()=>{
            const query = req.query;
            const params = req.params;

            const projectId = req.params.projectId;
            const deviceType = req.query.deviceType;

            const timeFrom = req.query.timeFrom;
            const timeTo = req.query.timeTo;

            const houseFormat = req.query.houseFormat;

            const pagingInfo = Util.PagingInfo(req.query.pageindex, req.query.pagesize, false);

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

                return {};
            };

            const where = _.assign(
                {
                    projectId: projectId,
                    houseFormat: houseFormat,
                }
                , districtLocation()
            );
            try {
                const houses = await MySQL.Houses.findAll(
                    _.assign({
                        where: where,
                        attributes:['id'],
                        include: [
                            {
                                model: MySQL.Rooms
                                , as: 'rooms'
                                , required: true
                            },
                            {
                                model: MySQL.Building, as: 'building'
                                , include: [{
                                    model: MySQL.GeoLocation, as: 'location',
                                }]
                                , required: true
                                , attributes: ['group', 'building', 'unit'],
                            },
                            {
                                model: MySQL.HouseDevices,
                                as: 'devices',
                                required: false,
                                attributes: ['deviceId', 'public'],
                                where:{
                                    endDate: 0,
                                    public: true
                                }
                            }
                        ]
                    },
                    pagingInfo ? {offset: pagingInfo.skip, limit: pagingInfo.size} : {}
                    )
                );

                //
                const roomIds = _.flatten(fp.map(house=>{
                    return fp.map(room=>{return room.id;})(house.rooms);
                })(houses));

                //seek contracts
                const contracts = await MySQL.Contracts.findAll({
                    where:{
                        roomId:{$in: roomIds},
                        from:{$gte: timeFrom},
                        to:{$lte: timeTo},
                    }
                });
                //seek

                res.send(houses);
            }
            catch (e){
                log.error(e, projectId, req.query);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        })();
    },
};
