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
                                {'$rooms.devices.deviceId$': {$regexp: query.q}},
                                {'$devices.deviceId$': {$regexp: query.q}},
                            ]
                        } : {}
                    ]),
                    attributes:['id', 'roomNumber'],
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
                            , include: [
                                {
                                    model: MySQL.Contracts
                                    , as: 'contracts'
                                    , attributes: ['userId']
                                    , include: [{
                                        model: MySQL.Users
                                        , as: 'user'
                                        , attributes: ['name']
                                    }]
                                }
                                ,{
                                    model: MySQL.HouseDevices,
                                    as: 'devices',
                                    required: true,
                                    where:{
                                        endDate: 0
                                    }
                                }
                            ]
                        }
                        ,{
                            model: MySQL.HouseDevices,
                            as: 'devices',
                            required: false,
                            where:{
                                endDate: 0,
                                public: true
                            }
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
                            roomNumber: house.roomNumber,
                            contract: fp.getOr(null)('contracts[0]')(room)
                        }];
                    })(house.rooms));
                })(houses));

                const sourceIdMapping = fp.extendAll([
                    houseIdMapping,
                    roomIdMapping
                ]);

                // const deletedAtTime = moment().format('YYYY-MM-DD HH:mm:ss');
                // const queryDevices = `select devices.*, hDevices.sourceId, hDevices.startDate, hDevices.endDate, hDevices.public
                //         from
                //             \`devices\` as \`devices\`
                //             inner join devicesChannels as channels on devices.deviceId=channels.deviceId
                //             inner join housesDevices as hDevices on devices.deviceId=hDevices.deviceId
                //         where
                //             \`devices\`.\`projectId\`='6367598515924897792'
                //             and hDevices.endDate=0
                //             and (\`devices\`.\`deletedAt\` > '${deletedAtTime}' OR \`devices\`.\`deletedAt\` IS NULL)
                //             and (\`hDevices\`.deletedAt > '${deletedAtTime}' OR \`hDevices\`.\`deletedAt\` IS NULL)
                //             and （\`devices\`.\`deviceId\` REGEXP :q ${sourceIds.length ? `or housesDevices.sourceId IN (${sourceIds.toString()})`: ''} )`;
                // const devices = await MySQL.Sequelize.query(queryDevices, {replacements: {q: q}, type: MySQL.Sequelize.QueryTypes.SELECT})

                const devices = await MySQL.Devices.findAndCountAll({
                    where: fp.extendAll([
                        getQueryPower()
                        , getQueryStatus()
                        , {projectId: projectId}
                    ])
                    , include: [
                        {
                            model: MySQL.DevicesChannels,
                            as: 'channels',
                            required: true,
                        },
                        {
                            model: MySQL.HouseDevices,
                            as: 'houseRelation',
                            required: true,
                            where:{
                                endDate: 0
                                , sourceId: {$in: sourceIds}
                            }
                        }
                    ]
                    , offset: pagingInfo.skip
                    , limit: pagingInfo.size
                });

                const nowTime = moment().unix();
                const rows = fp.map(device=>{
                    const roomIns = sourceIdMapping[fp.getOr(0)('houseRelation.sourceId')(device)];

                    return {
                        deviceId: device.deviceId
                        , status: getDeviceStatus(device, nowTime)
                        , scale: fp.getOr(0)('channels[0].scale')(device)
                        , updatedAt: moment(device.updatedAt).unix()
                        , building: fp.getOr({})('building')(roomIns)
                        , roomNumber: fp.getOr('')('roomNumber')(roomIns)
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
                const where = fp.extendAll(
                    [
                        {
                            projectId: projectId,
                            deviceId:fp.assign(
                                {
                                    $notIn: deviceIds
                                }
                                , q ? {$regexp: q} : {}
                            )
                        }
                        , getQueryPower()
                        , getQueryStatus()
                    ]
                );
                const devices = await MySQL.Devices.findAndCountAll(
                    fp.assign(
                        {
                            where: where,
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
                        deviceId: device.deviceId
                        , memo: device.memo
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

        const deviceIds = req.body.deviceIds;

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
