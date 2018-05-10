'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
const moment = require('moment');
const {formatMysqlDateTime} = Include('/services/v1.0/common');

function reGroupDetail(devices, contracts, devicePrices, timeFrom, timeTo) {

    if (!contracts.length && !devicePrices.length) {
        return [];
    }

    const belongTo = (dateA, dateB) => {
        return !(dateA[0] > dateB[1] || dateA[1] < dateB[0]);
    };
    const matchItem = (dateBase, items) => {
        const length = items.length;
        for (let i = 0; i < length; i++) {
            const item = items[i];

            const itemDate = getDate(item);
            if (dateBase[0] > itemDate[1] || dateBase[1] < itemDate[0]) {
                continue;
            }

            if (dateBase[0] < itemDate[0]) {
                return {
                    startDate: dateBase[0],
                    endDate: dateBase[1],
                };
            }

            const date = minDate(dateBase, getDate(item));
            return fp.assign(
                {
                    startDate: date[0],
                    endDate: date[1],
                },
                belongTo(date, getDate(item)) ? {item: item} : {},
            );
        }

        return null;
    };
    const minDate = (dateA, dateB) => {
        const sortedDate = fp.sortedUniq(fp.concat(dateA, dateB).sort());

        if (sortedDate.length < 2) {
            return null;
        }

        const value = dateA[0] || dateB[0];
        const index = sortedDate.indexOf(value);
        return [sortedDate[index], sortedDate[index + 1]];
    };
    const getDate = (obj) => {
        if (!obj) {
            return [];
        }

        const originStartDate = obj.startDate || obj.from || timeFrom;
        const originEndDate = obj.endDate || obj.to || timeTo;

        return [
            moment.unix(
                originStartDate < timeFrom ? timeFrom : originStartDate).
                startOf('days').
                unix(),
            moment.unix(originEndDate > timeTo ? timeTo : originEndDate).
                startOf('days').
                unix(),
        ];
    };

    let details = [];

    devices.map(device => {
        const deviceDate = getDate(device);
        const dateBase = getDate(device);
        for (; ;) {
            const contract = matchItem(dateBase, contracts);

            const housePrice = matchItem(dateBase, devicePrices);

            const date = minDate(getDate(contract), getDate(housePrice));

            // console.info(date, device.deviceId, fp.getOr(null)('item.id')(contract), fp.getOr(null)('item.price')(housePrice));
            details.push({
                date: date,
                device: device,
                contract: contract,
                price: housePrice,
            });
            if (date) {
                dateBase[0] = date[1];
                dateBase[0] = moment.unix(dateBase[0]).add(1, 'days').unix();
            }
            else {
                break;
            }

            if (date[1] >= deviceDate[1]) {
                break;
            }
        }
    });

    return fp.reverse(details);
}

module.exports = {
    get: async (req, res) => {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        const query = req.query;
        // const params = req.params;

        const projectId = req.params.projectId;
        const roomId = query.roomId;
        const houseId = query.houseId;
        const q = query.q;

        // const deviceType = req.query.deviceType;
        if (!Util.ParameterCheck(query,
                ['houseFormat', 'startDate', 'endDate'])) {
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED,
                {error: 'missing starteDate/endDate'}));
        }

        const timeFrom = moment.unix(req.query.startDate).
            startOf('days').
            unix();
        const timeTo = moment.unix(req.query.endDate).startOf('days').unix();

        const ymdTimeFrom = parseInt(moment.unix(req.query.startDate).
            startOf('days').
            format('YYYYMMDD'));
        const ymdTimeTo = parseInt(
            moment.unix(req.query.endDate).startOf('days').format('YYYYMMDD'));

        const houseFormat = req.query.houseFormat;

        const pagingInfo = Util.PagingInfo(req.query.index, req.query.size,
            true);

        const districtLocation = () => {
            if (query.locationId) {
                // geoLocationIds = [query.locationId];
                return {'$building.location.id$': query.locationId};
            }
            else if (query.districtId) {
                if (Util.IsParentDivision(query.districtId)) {
                    return {
                        '$building.location.divisionId$': {
                            $regexp: Util.ParentDivision(query.districtId),
                        },
                    };
                }
                else {
                    return {
                        '$building.location.divisionId$': query.districtId,
                    };
                }
            }

            return {};
        };

        const where = fp.extendAll([
            {
                projectId: projectId,
                houseFormat: houseFormat,
            }
            , districtLocation()
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
            const getIncludeRoom = () => {
                return !houseId ? fp.assign(
                    {
                        model: MySQL.Rooms
                        , as: 'rooms'
                        , required: true
                        , include: [
                            {
                                model: MySQL.HouseDevices,
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
                                        model: MySQL.DeviceHeartbeats,
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
                                    }
                                ],
                            },
                            {
                                model: MySQL.HouseDevicePrice,
                                as: 'prices',
                                where:{
                                    category: 'CLIENT'
                                },
                                required: false,
                                attributes: ['houseId', 'category', 'type', 'price']
                            },
                            {
                                model: MySQL.Contracts,
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
                                        model: MySQL.Users,
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
                ) : null;
            };
            const houseInclude = fp.compact([
                getIncludeRoom()
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
                        }
                    ],
                },
                {
                    model: MySQL.HouseDevicePrice,
                    as: 'prices',
                    where:{
                        category: 'CLIENT'
                    },
                    required: false,
                    attributes: ['houseId', 'category', 'type', 'price']
                }
            ]);
            const houses = await MySQL.Houses.findAll(
                {
                    where: where,
                    include: houseInclude,
                },
            );

            const houseAndRooms = fp.flatten(fp.map(house => {
                const plain = house.toJSON();

                const rooms = fp.map(room => {
                    return fp.extendAll([
                        room,
                        {building: house.building},
                        {roomNumber: house.roomNumber}]);
                })(plain.rooms);

                if (houseFormat !== Typedef.HouseFormat.SHARE || roomId) {
                    return rooms;
                }
                else {
                    return fp.flatten(fp.union(
                        !q || house.devices.length ? house : []
                        , rooms,
                    ));
                }

            })(houses));

            //
            const doPaging = (data) => {
                return data.slice(pagingInfo.skip, pagingInfo.skip +
                    pagingInfo.size);
            };
            const pagedHouseRooms = doPaging(houseAndRooms);

            const returnData = fp.map(slot => {

                if (houseId || slot.rooms) {
                    //public device
                    const house = slot;
console.log('house', house.toJSON());
                    return {
                        houseId: house.id,
                        building: house.building.building,
                        unit: house.building.unit,
                        roomNumber: house.roomNumber,
                        location: house.building.location,
                        details: [        {
                            startDate: timeFrom,
                            endDate: timeTo,
                            device: house.device,
                            price: fp.get('prices[0]')(house),
                            "amount": 0,
                            "usage": 0,
                            "startScale": 0,
                            "endScale": 0
                        }
                        ],

                    };

                }
                else {
                    const room = slot;
                    //room
                    const devices = room.devices;
                    //end of contract have to subtract 1 day
                    console.log('room', room);
                    return {
                        roomId: room.id,
                        building: room.building.building,
                        unit: room.building.unit,
                        roomNumber: room.roomNumber,
                        roomName: room.name,
                        location: room.building.location,
                        details: fp.map( device => ({
                            startDate: timeFrom,
                            endDate: timeTo,
                            device: device,
                            contract: room.contracts,
                            "contract1": {
                                "userId": 4199330819,
                                "userName": "俞水铭",
                                "startDate": 1504886400,
                                "endDate": 1525881600
                            },
                            price: room.prices,
                            "amount": 0,
                            "usage": 0,
                            "startScale": 0,
                            "endScale": 0
                        }))(room.devices),
                    };
                }

            })(pagedHouseRooms);

            res.send({
                paging: {
                    count: houseAndRooms.length,
                    index: pagingInfo.index,
                    size: pagingInfo.size,
                },
                data: returnData,
            });

        }
        catch (e) {
            log.error(e, projectId, req.query);
            res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        }
    },
};
