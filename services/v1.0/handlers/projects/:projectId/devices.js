'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
const moment = require('moment');
const common = Include('/services/v1.0/common');

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
		 * mode=FREE
		 */
        (async()=>{
            const projectId = req.params.projectId;
            const query = req.query;

            const power = query.switch || 'ALL';
            const service = query.status || 'ALL';
            const q = query.q;

            if(!Util.ParameterCheck(query,
                ['mode']
            )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }
            const mode = query.mode;
            const pagingInfo = Util.PagingInfo(query.index, query.size, true);

            const getQueryPower = ()=>{
                return power === 'ALL' ? {} : {
                    status:{$regexp: power === 'OFF' ? 'EMC_OFF' : 'EMC_ON'}
                };
            };
            const getQueryStatus = ()=>{
                return service === 'ALL' ? {} : {
                    updatedAt: service === 'OFFLINE' ?
                        {$lt: MySQL.Sequelize.literal(`FROM_UNIXTIMESTAMP(${nowTime}-freq)`)} :
                        {$gt: MySQL.Sequelize.literal(`FROM_UNIXTIMESTAMP(${nowTime}-freq)`)}
                };
            };
            const getDeviceStatus = (device, nowTime)=>{
                const updatedAt = moment(device.updatedAt);
                const service = updatedAt < nowTime - device.freq ? 'EMC_OFFLINE':'EMC_ONLINE';
                const power = fp.getOr('EMC_OFF')('status.switch')(device);

                return {
                    service: service,
                    switch: power
                };
            };

            if(mode === 'BIND'){
                const houses = await MySQL.Houses.findAll({
                    where:fp.extendAll([
                        {projectId: projectId}
                        , common.districtLocation(query) || {}
                        , q? {
                            $or: [
                                {'$building.location.name$': {$regexp: query.q}},
                                {roomNumber: {$regexp: query.q}},
                                {code: {$regexp: query.q}},
                                {'$rooms.contracts.user.name$': {$regexp: query.q}},
                            ]
                        } : {}
                    ]),
                    attributes:['id'],
                    include: [
                        {
                            model: MySQL.Building
                            , as: 'building'
                            , required: true
                            , attributes: ['building', 'unit']
                            , include:[{
                                model: MySQL.GeoLocation
                                , as: 'location'
                                , attributes:['name']
                                , required: true
                            }]
                        }
                        , {
                            model: MySQL.Rooms
                            , as: 'rooms'
                            , required: true
                            , attributes: ['id']
                            , include: [{
                                model: MySQL.Contracts
                                , as: 'contracts'
                                , attributes: ['userId']
                                , include: [{
                                    model: MySQL.Users
                                    , as: 'user'
                                    , attributes: ['name']
                                }]
                            }]
                        }
                    ]
                });

                const sourceIds = fp.flattenDeep(fp.map(house=>{
                    return fp.map(room=>{ return room.id; })(house.rooms);
                })(houses));

                const houseIdMapping = fp.fromPairs(fp.map(house=>{
                    return [house.id, {
                        id: house.id,
                        building: house.building,
                        contract: null
                    }];
                })(houses));

                const roomIdMapping = fp.extendAll(fp.map(house => {
                    return fp.fromPairs(fp.map(room => {
                        return [room.id, {
                            id: room.id,
                            building: house.building,
                            contract: fp.getOr(null)('contracts[0]')(room)
                        }];
                    })(house.rooms));
                })(houses));

                const sourceIdMapping = fp.extendAll([
                    houseIdMapping,
                    roomIdMapping
                ]);

                const devices = await MySQL.Devices.findAndCountAll({
                    where: fp.extendAll([
                        getQueryPower()
                        , getQueryStatus()
                        , {projectId: projectId}
                    ])
                    , include:[
                        {
                            model: MySQL.DevicesChannels,
                            as: 'channels',
                            required: true,
                        },
                        {
                            model: MySQL.HouseDevices,
                            as: 'houseRelation',
                            required: true,
                            where: {
                                sourceId:{$in: sourceIds}
                            }
                        }
                    ]
                });

                const nowTime = moment().unix();
                const rows = fp.map(device=>{
                    const roomIns = sourceIdMapping[fp.getOr(0)('houseRelation[0].sourceId')(device)];

                    return {
                        deviceId: device.deviceId
                        , status: getDeviceStatus(device, nowTime)
                        , scale: fp.getOr(0)('channels[0].scale')(device)
                        , updatedAt: moment(device.updatedAt).unix()
                        , building: fp.getOr({})('building')(roomIns)
                        , contract: fp.getOr({})('contract')(roomIns)
                    };
                })(devices.rows);

                res.send({
                    paging:{
                        count: devices.count,
                        index: pagingInfo.index,
                        size: pagingInfo.size
                    },
                    data: rows
                });
            }
            else if(mode === 'FREE'){
                const houseDevices = await MySQL.HouseDevices.findAll(
                    {
                        where:{
                            projectId: projectId,
                            endDate: 0
                        },
                        attributes:[
                            [MySQL.Sequelize.fn('DISTINCT', MySQL.Sequelize.col('deviceId')), 'deviceId']
                        ]
                    });
                const deviceIds = fp.map(device=>{return device.deviceId;})(houseDevices);

                const nowTime = moment().unix();
                const devices = await MySQL.Devices.findAndCountAll(
                    fp.assign(
                        {
                            where: fp.extendAll(
                                [
                                    {
                                        projectId: projectId,
                                        deviceId:{$notIn: deviceIds}
                                    }
                                    , getQueryPower()
                                    , getQueryStatus()
                                    , q ? {
                                        deviceId:{$regexp: q}
                                    } : {}
                                ]
                            ),
                            include:[
                                {
                                    model: MySQL.DevicesChannels,
                                    as: 'channels'
                                }
                            ]
                        }
                        , pagingInfo? {offset: pagingInfo.skip, limit: pagingInfo.size} : {}
                    )
                );

                const returnDevices = fp.map(device=>{

                    const updatedAt = moment(device.updatedAt);
                    // const service = updatedAt < nowTime - device.freq ? 'EMC_OFFLINE':'EMC_ONLINE';
                    // const power = fp.getOr('EMC_OFF')('status.switch')(device);

                    return {
                        deviceId: device.deviceId.substr(3)
                        , status: getDeviceStatus(device, nowTime)
                        , scale: fp.getOr(0)('channels[0].scale')(device)
                        , updatedAt: updatedAt.unix()
                    };
                })(devices.rows);

                res.send({
                    paging:{
                        count: devices.count,
                        index: pagingInfo.index,
                        size: pagingInfo.size
                    },
                    data: returnDevices
                });
            }

        })();
    }
    , delete: async(req, res)=>{

        const projectId = req.params.projectId;

        const deviceIds = req.body;

        MySQL.HouseDevices.count({
            where:{
                projectId: projectId,
                deviceId: {$in: deviceIds},
                endDate: 0
            }
        }).then(
            count=>{
                if(count){
                    return res.send(ErrorCode.ack(ErrorCode.DEVICEINBIND));
                }

                MySQL.Devices.destroy({
                    where:{
                        projectId: projectId,
                        deviceId: {$in: deviceIds}
                    }
                }).then(
                    ()=>{
                        res.send(204);
                    },
                    err=>{
                        log.error(err, projectId, deviceIds);
                        res.send(ErrorCode.ack(ErrorCode.DATABASEEXEC));
                    }
                );
            },
            err=>{
                log.error(err, projectId, deviceIds);
                res.send(ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        );
    },
};
