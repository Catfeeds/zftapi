const _ = require('lodash');
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
            query.buildingId ? {'$Building.id$': query.buildingId} : {},
            query.houseFormat ? {houseFormat: query.houseFormat} : {},
            query.houseStatus ? { 'status': query.houseStatus } : {},
            query.roomStatus ? {'$Rooms.status$': query.roomStatus }: {},
            query.layoutId ? {'layoutId': query.layoutId}: {},
            query.floor ? {'currentFloor': query.floor}: {},
            query.q ? {$or: [
                {roomNumber: {$regexp: query.q}},
                {code: {$regexp: query.q}},
            ]} : {},
            query.bedRoom ? {'$Layouts.bedRoom$': query.bedRoom} : {}
        );

        const queryInclude = _.union(
            [
                {
                    model: MySQL.Building, as: 'Building'
                    , include:[{
                    model: MySQL.GeoLocation, as: 'Location'
                }]
                },
                {model: MySQL.Layouts, as: 'Layouts'},
                {
                    model: MySQL.Rooms,
                    as: 'Rooms',
                    include:[
                        {
                            model: MySQL.HouseDevices,
                            as: 'Devices'
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