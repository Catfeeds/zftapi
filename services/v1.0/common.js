const _ = require('lodash');

exports.UpsertGeoLocation = (location, t)=>{
    location.code = location.id;
    location = _.omit(location, 'id');

    return MySQL.GeoLocation.findOrCreate({
        where:{
            code: location.code
        },
        transaction: t,
        defaults:location
    })
};

exports.AsyncUpsertGeoLocation = async(location, t)=>{
    location.code = location.id;
    location = _.omit(location, 'id');

    return await MySQL.GeoLocation.findOrCreate({
        where:{
            code: location.code
        },
        transaction: t,
        defaults:location
    })
};