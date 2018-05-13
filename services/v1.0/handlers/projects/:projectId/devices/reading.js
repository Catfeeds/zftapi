'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
const moment = require('moment');
const {formatMysqlDateTime} = Include('/services/v1.0/common');

module.exports = {
    get: async (req, res) => {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        const query = req.query;

        const projectId = req.params.projectId;
        const {
            roomId, houseId, q, startDate, endDate, houseFormat, index, size,
            locationId, districtId,
        } = query;

        if (!Util.ParameterCheck(query,
            ['houseFormat', 'startDate', 'endDate'])) {
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED,
                {error: 'missing houseFormat, startDate or endDate'}));
        }

        const timeFrom = moment.unix(startDate).
            startOf('days').
            unix();
        const timeTo = moment.unix(endDate).startOf('days').unix();

        const pagingInfo = Util.PagingInfo(index, size, true);

        const where = fp.extendAll([
            {
                projectId,
                houseFormat,
            }
            , districtLocation(locationId, districtId)
            , houseId ? {id: houseId} : {}
            , q ? {
                $or: [
                    {'$building.location.name$': {$regexp: q}}
                    , {roomNumber: {$regexp: q}}
                    , {'$rooms.contracts.user.name$': {$regexp: q}}
                    , {'$rooms.contracts.user.mobile': {$regexp: q}}
                    , {
                        $or: [
                            {'$rooms.devices.deviceId$': {$regexp: q}}
                            , {'$devices.deviceId$': {$regexp: q}},
                        ],
                    },
                ],
            } : {},
        ]);

        try {
            const houseInclude = fp.compact([
                houseId ?
                    null :
                    getIncludeRoom(MySQL)(roomId, timeFrom, timeTo, projectId)
                ,
                {
                    model: MySQL.Building,
                    as: 'building'
                    ,
                    include: [
                        {
                            model: MySQL.GeoLocation,
                            as: 'location',
                            required: true,
                        }]
                    ,
                    required: true
                    ,
                    attributes: ['group', 'building', 'unit'],
                },
                deviceInclude(MySQL)(timeFrom, timeTo, projectId),
                {
                    model: MySQL.HouseDevicePrice,
                    as: 'prices',
                    where: {
                        category: 'CLIENT',
                    },
                    required: false,
                    attributes: ['houseId', 'category', 'type', 'price'],
                },
            ]);
            const houses = await MySQL.Houses.findAll(
                {
                    where,
                    include: houseInclude,
                },
            );
            const heartbeats = await heartbeatInProject(MySQL)(timeFrom,
                timeTo, projectId);
            const houseAndRooms = fp.flatten(fp.map(house => {
                const plain = house.toJSON();

                const rooms = fp.map(room => {
                    return fp.extendAll([
                        room,
                        {building: plain.building},
                        {prices: plain.prices},
                        {roomNumber: plain.roomNumber}]);
                })(plain.rooms);

                if (houseFormat !== Typedef.HouseFormat.SHARE || roomId) {
                    return rooms;
                }
                else {
                    return fp.flatten(fp.union(
                        fp.isEmpty(plain.devices) ? [] : [plain]
                        , rooms,
                    ));
                }
            })(houses));

            const doPaging = (data) => {
                return data.slice(pagingInfo.skip, pagingInfo.skip +
                    pagingInfo.size);
            };
            res.send({
                paging: {
                    count: houseAndRooms.length,
                    index: pagingInfo.index,
                    size: pagingInfo.size,
                },
                data: fp.map(fp.pipe(extractDetail(houseId, timeFrom, timeTo),
                    matchHeartbeats(heartbeats), fp.omit('prices')))(
                    doPaging(houseAndRooms)),
            });

        }
        catch (e) {
            log.error(e, projectId, req.query);
            res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        }
    },
};

const contractSummary = info => {
    const contract = fp.get('contracts[0]')(info);
    return contract ? ({
        userId: contract.userId,
        userName: contract.user.name,
        startDate: contract.from,
        endDate: contract.to,
    }) : {};
};

const readingOf = (room, device) => {
    const {startScale: startScaleOrigin, endScale: endScaleOrigin} = device;
    const [startScale, endScale] = fp.map(f => Number(f).toFixed(4))([startScaleOrigin, endScaleOrigin]);
    const price = fp.getOr(0)('prices[0].price')(room);
    const usage = Number(endScale - startScale).toFixed(4);
    return {
        price,
        amount: (endScale - startScale) * price,
        usage,
        startScale,
        endScale,
    };
};

const extractDetail = (houseId, timeFrom, timeTo) => slot => {
    if (houseId || slot.rooms) {
        //public device
        const house = slot;
        return {
            houseId: house.id,
            building: house.building.building,
            unit: house.building.unit,
            roomNumber: house.roomNumber,
            location: house.building.location,
            prices: house.prices,
            details: [
                {
                    device: {
                        deviceId: house.devices[0].deviceId,
                    },
                    ...readingOf(house, house.devices[0]),
                    startDate: timeFrom,
                    endDate: timeTo,
                },
            ],
        };
    }
    else {
        const room = slot;

        return {
            roomId: room.id,
            building: room.building.building,
            unit: room.building.unit,
            roomNumber: room.roomNumber,
            roomName: room.name,
            location: room.building.location,
            prices: room.prices,
            details: fp.map(device => ({
                device: {
                    deviceId: device.deviceId,
                },
                ...contractSummary(room),
                startDate: timeFrom,
                endDate: timeTo,
            }))(fp.uniqBy('deviceId')(room.devices)),
        };
    }
};

const matchHeartbeats = (heartbeats) => slot => {
    const singleDevice = slot => device => {
        const reading = fp.head(fp.get(device.device.deviceId)(heartbeats));
        return reading ? {...device, ...readingOf(slot, reading)} : device;
    };
    const devices = fp.get('details')(slot);
    return devices ?
        {
            ...slot,
            details: fp.map(singleDevice(slot))(devices),
        } :
        slot;
};

const districtLocation = (locationId, districtId) => {
    if (locationId) {
        return {'$building.location.id$': locationId};
    }
    else if (districtId) {
        if (Util.IsParentDivision(districtId)) {
            return {
                '$building.location.divisionId$': {
                    $regexp: Util.ParentDivision(districtId),
                },
            };
        }
        else {
            return {
                '$building.location.divisionId$': districtId,
            };
        }
    } else {
        return {};
    }
};

const getIncludeRoom = SequelizeModel => (
    roomId, timeFrom, timeTo, projectId) => fp.assign(
    {
        model: SequelizeModel.Rooms, as: 'rooms', required: true,
        include: [
            deviceInclude(SequelizeModel)(timeFrom, timeTo, projectId),
            {
                model: SequelizeModel.Contracts,
                as: 'contracts',
                required: false,
                where: {
                    $or: [
                        {
                            from: {$lte: timeFrom},
                            to: {$gte: timeFrom},
                        },
                        {
                            from: {$lte: timeTo},
                            to: {$gte: timeTo},
                        },
                        {
                            from: {$gte: timeFrom},
                            to: {$lte: timeTo},
                        },
                    ],
                },
                include: [
                    {
                        model: SequelizeModel.Users,
                        as: 'user',
                        required: true,
                    },
                ],
            },
        ],
    },
    roomId ? {
        where: {
            id: roomId,
        },
    } : {},
);

const deviceInclude = MySQL => (timeFrom, timeTo, projectId) => ({
    model: MySQL.HouseDevices,
    as: 'devices',
    required: false,
    distinct: true,
    where: {
        projectId,
        endDate: 0,
        public: true,
    },
    attributes: ['deviceId'],
});

const heartbeatInProject = MySQL => async (timeFrom, timeTo, projectId) => {
    const groupingData = await MySQL.DeviceHeartbeats.findAll(
        {
            attributes: [
                'deviceId',
                [
                    MySQL.Sequelize.fn('max',
                        MySQL.Sequelize.col('total')), 'endScale'],
                [
                    MySQL.Sequelize.fn('min',
                        MySQL.Sequelize.col('total')), 'startScale']],
            group: ['deviceId'],
            where: {
                createdAt: {
                    $gte: formatMysqlDateTime(timeFrom),
                    $lte: formatMysqlDateTime(timeTo),
                },
            },
            include: [
                {
                    model: MySQL.HouseDevices,
                    required: true,
                    where: {
                        projectId,
                        endDate: 0,
                        public: true,
                    },
                    attributes: ['projectId'],
                }],
        },
    );
    return fp.groupBy('deviceId')(fp.map(
        data => ({...data.toJSON(), startDate: timeFrom, endDate: timeTo}))(
        groupingData));
};
