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
            const status = query.status || 'ALL';
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
                return status === 'ALL' ? {} : {
                    updatedAt: status === 'OFFLINE' ?
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
                }
            };

            if(mode === 'BIND'){
                //
                // const houseDevices = await MySQL.HouseDevices.findAndCountAll(
                //     fp.assign(
                //         {
                //             where:{
                //                 projectId: projectId,
                //                 endDate: 0
                //             },
                //             attributes:[
                //                 [MySQL.Sequelize.fn('DISTINCT', MySQL.Sequelize.col('deviceId')), 'deviceId']
                //             ]
                //         }
                //         , pagingInfo? {offset: pagingInfo.skip, limit: pagingInfo.size} : {}
                //     )
                // );
                // const deviceIds = fp.map(device=>{return device.deviceId;})(houseDevices);

                const houses = await MySQL.Houses.findAll({
                    where:fp.extendAll([
                        {projectId: projectId}
                        , getQueryPower()
                        , getQueryStatus()
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
                    include: [
                        {
                            model: MySQL.HouseDevices
                            , as:'devices'
                            , required: false
                            , where: {
                                public: true
                            }
                        },
                        {
                            model: MySQL.Building
                            , as: 'building'
                            , required: true
                            , include:[{
                                model: MySQL.GeoLocation
                                , as: 'location'
                                , attributes:['name']
                                , required: true
                            }]
                            , attributes: ['group', 'building', 'unit'],
                        },
                        {
                            model: MySQL.Rooms
                            , as: 'rooms'
                            , required: true
                            , attributes: ['name']
                            , include:[
                                {
                                    model: MySQL.Contracts
                                    , as: 'contracts'
                                    , include:[
                                        {
                                            model: MySQL.Users
                                            , as: 'user'
                                        }
                                    ]
                                }
                                , {
                                    model: MySQL.HouseDevices,
                                    as: 'devices',
                                    required: true,
                                    where:{
                                        public: false,
                                        endDate: 0
                                    },
                                    include:[
                                        {
                                            model: MySQL.Devices,
                                            as: 'device',
                                            required: true,
                                            include:[
                                                {
                                                    model: MySQL.DevicesChannels,
                                                    as: 'channels',
                                                    required: true,
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                });

                log.info(houses);

                const nowTime = moment().unix();
                _.flattenDeep(fp.map(house=>{
                    return fp.map(room=>{
                        return fp.map(device=>{
                            return {
                                    deviceId: device.deviceId
                                    , status: getDeviceStatus(device, nowTime)
                                    , scale: fp.getOr(0)('channels[0].scale')(device)
                                    , updatedAt: moment(device.updatedAt).unix()
                                    , building: house.building
                                    , roomNumber: house.roomNumber
                                    , roomName: room.name
                                };
                        })(room.devices);
                    })(house.rooms);
                })(houses));
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
                const devices = await MySQL.Devices.findAll(
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

                    // const updatedAt = moment(device.updatedAt);
                    // const service = updatedAt < nowTime - device.freq ? 'EMC_OFFLINE':'EMC_ONLINE';
                    // const power = fp.getOr('EMC_OFF')('status.switch')(device);

                    return {
                        deviceId: device.deviceId.substr(3)
                        , status: getDeviceStatus(device, nowTime)
                        , scale: fp.getOr(0)('channels[0].scale')(device)
                        , updatedAt: updatedAt.unix()
                    };
                })(devices);

                res.send(returnDevices);
            }
return;


            const deviceIds = fp.map(device=>{
                return device.deviceId;
            })(await MySQL.HouseDevices.findAll({
                where: fp.assign(
                    {
                        projectId: projectId,
                        endDate: 0
                    },

                )
                , distinct: 'deviceId'
                , attributes: ['deviceId']
            }));

            //
            const deviceQuery = fp.assignIn({
                projectId: projectId,
                deviceId: {$notIn: deviceIds},
            })(query.q ? {
                $or: [
                    {name: {$regexp:query.q}},
                    {deviceId: {$regexp: query.q}},
                    {tag: {$regexp: query.q}},
                ],
            } : {});

            try {
                const result = await MySQL.Devices.findAndCountAll({
                    where: deviceQuery,
                    attributes: ['deviceId', 'name'],
                    offset: pagingInfo.skip,
                    limit: pagingInfo.size
                });

                res.send(
                    {
                        paging: {
                            count: result.count,
                            index: pagingInfo.index,
                            size: pagingInfo.size
                        },
                        data: fp.map(device => {
                            return {
                                deviceId: device.deviceId.substr(3),
                                title: device.name,
                            };
                        })(result.rows)
                    }
                );
            }
            catch(err){
                log.error(err, projectId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }

        })();

        // if(!Typedef.IsHouseFormat(houseFormat)){
        //     return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERERROR, 'houseFormat'));
        // }
        //
        //
        // const housesQuery = ()=> {
        //     switch (houseFormat) {
        //         case Typedef.HouseFormat.ENTIRE:
        //             return common.QueryEntire(projectId, query,
        //                 [
        //                     {
        //                         model: MySQL.HouseDevices,
        //                         as: 'Devices'
        //                     },
        //                 ]
        //             );
        //             break;
        //         default:
        //             break;
        //     }
        // };
        // housesQuery().then(
        //     data=>{
        //         res.send(data)
        //     },
        //     err=>{
        //         log.error(err, projectId, query);
        //         res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        //     }
        // );
    }
};
