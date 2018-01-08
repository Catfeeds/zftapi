const _ = require('lodash');
const fp = require('lodash/fp');
const moment = require('moment');

exports.UpsertGeoLocation = (location, t)=>{
    return MySQL.GeoLocation.findOrCreate({
        where:{
            code: location.code
        },
        transaction: t,
        defaults:location
    })
};

exports.AsyncUpsertGeoLocation = async(location, t)=>{
    location.code = location.id || location.code;
    location = _.omit(location, 'id');

    return await MySQL.GeoLocation.findOrCreate({
        where:{
            code: location.code
        },
        transaction: t,
        defaults:location
    })
};

exports.QueryEntire = (projectId, query, include, attributes)=>{
    return new Promise((resolve, reject)=>{
        const where = _.assignIn({},
            query.buildingId ? {'$building.id$': query.buildingId} : {},
            query.houseFormat ? {houseFormat: query.houseFormat} : {},
            query.houseStatus ? { 'status': query.houseStatus } : {},
            query.roomStatus ? {'$rooms.status$': query.roomStatus }: {},
            query.layoutId ? {'layoutId': query.layoutId}: {},
            query.floor ? {'currentFloor': query.floor}: {},
            query.q ? {$or: [
                {roomNumber: {$regexp: query.q}},
                {code: {$regexp: query.q}},
            ]} : {},
            query.bedRoom ? {'$layouts.bedRoom$': query.bedRoom} : {}
        );

        const queryInclude = _.union(
            [
                {
                    model: MySQL.Building, as: 'building'
                    , include:[{
                    model: MySQL.GeoLocation, as: 'location'
                }]
                },
                {model: MySQL.Layouts, as: 'layouts'},
                {
                    model: MySQL.Rooms,
                    as: 'rooms',
                    include:[
                        {
                            model: MySQL.HouseDevices,
                            as: 'devices'
                        }
                    ]
                }
            ],
            include ? include : []
        );


        const pagingInfo = Util.PagingInfo(query.index, query.size, true);

        Promise.all([
            MySQL.Houses.count(
                _.assignIn({
                    where: where,
                }, attributes ? attributes:{})
            ),
            MySQL.Houses.findAll(
                _.assignIn({
                    where: where,
                    subQuery: false,
                    include: queryInclude,
                    offset: pagingInfo.skip,
                    limit: pagingInfo.size
                }, attributes ? attributes:{})
            )
        ]).then(
            result=>{
                const count = result[0];

                resolve({
                    count: count,
                    data: result[1]
                })
            },
            err=>{
                log.error(err, projectId, query, include, attributes);
                reject(ErrorCode.DATABASEEXEC);
            }
        );
    });
};


exports.omitSingleNulls = item => _.omitBy(item, _.isNull);
exports.innerValues = item => item.dataValues;
exports.omitNulls = fp.map(item => _.omitBy(exports.innerValues(item), _.isNull));
exports.assignNewId = (model) => fp.defaults({id: SnowFlake.next()})(model);

exports.singleRoomTranslate = model => {
	const room = model.dataValues;
	const status = room.status;
	const house = room.house.dataValues;
	const building = house.building.dataValues;
	const location = building.location.dataValues;
	return {
		id: room.id,
		houseId: house.id,
		locationName: location.name,
		group: building.group,
		building: building.building,
		unit: building.unit,
		roomNumber: house.roomNumber,
		roomName: room.name,
		status
	}
};
