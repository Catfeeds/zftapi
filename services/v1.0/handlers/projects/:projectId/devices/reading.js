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
                houseId ? null : getIncludeRoom(MySQL)(roomId, timeFrom, timeTo)
                , {
                    model: MySQL.Building, as: 'building'
                    , include: [
                        {
                            model: MySQL.GeoLocation,
                            as: 'location',
                            required: true,
                        }]
                    , required: true
                    , attributes: ['group', 'building', 'unit'],
                }
                , {
                    model: MySQL.HouseDevices,
                    as: 'devices',
                    required: false,
                    where: {
                        endDate: 0,
                        public: true,
                    },
                    include: [
                        {
                            model: MySQL.DeviceHeartbeats,
                            required: false,
                            attributes: ['total'],
                            where: {
                                createdAt: {
                                    $gte: formatMysqlDateTime(timeFrom),
                                    $lte: formatMysqlDateTime(timeTo),
                                },
                            },
                        },
                    ],
                },
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

            const houseAndRooms = fp.flatten(fp.map(house => {
                const plain = house.toJSON();

                const rooms = fp.map(room => {
                    return fp.extendAll([
                        room,
                        {building: plain.building},
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
                data: fp.map(extractDetail(houseId, timeFrom, timeTo))(
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
        endDate: infocontract.to,
    }) : {};
};

const readingOf = (room, device) => {
    const allPoints = fp.getOr([0, 0])('deviceHeartbeats')(device);
    const startScale = fp.getOr(0)('total')(fp.head(allPoints));
    const endScale = fp.getOr(0)('total')(fp.last(allPoints));
    const price = fp.getOr(0)('prices[0].price')(room);
    const usage = endScale - startScale;
    return {
        price,
        usage,
        startScale,
        endScale,
        amount: (endScale - startScale) * price,
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
            details: [
                {
                    startDate: timeFrom,
                    endDate: timeTo,
                    device: {
                        deviceId: house.devices[0].deviceId,
                    },
                    ...readingOf(house, house.devices[0]),
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
            details: fp.map(device => ({
                startDate: timeFrom,
                endDate: timeTo,
                device: {
                    deviceId: device.deviceId,
                },
                ...contractSummary(room),
                ... readingOf(room, device),
            }))(room.devices),
        };
    }
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
    roomId, timeFrom, timeTo) => fp.assign(
    {
        model: SequelizeModel.Rooms, as: 'rooms', required: true,
        include: [
            {
                model: SequelizeModel.HouseDevices,
                as: 'devices',
                required: false,
                where: {
                    $or: [
                        {
                            startDate: {$lte: timeFrom},
                            endDate: {$gte: timeFrom},
                        },
                        {
                            startDate: {$lte: timeTo},
                            endDate: {$gte: timeTo},
                        },
                        {
                            startDate: {$gte: timeFrom},
                            endDate: {$lte: timeTo},
                        },
                    ],
                },
                include: [
                    {
                        model: SequelizeModel.DeviceHeartbeats,
                        required: false,
                        attributes: ['total', 'createdAt'],
                        where: {
                            createdAt: {
                                $gte: formatMysqlDateTime(
                                    timeFrom),
                                $lte: formatMysqlDateTime(
                                    timeTo),
                            },
                        },
                    },
                ],
            },
            {
                model: SequelizeModel.HouseDevicePrice,
                as: 'prices',
                where: {
                    category: 'CLIENT',
                },
                required: false,
                attributes: [
                    'houseId',
                    'category',
                    'type',
                    'price'],
            },
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