const _ = require('lodash');
const moment = require('moment');

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

exports.CreateHouse = (projectId, houseFormat, parentId, code, locationId, houseKeeper, desc, status, config)=>{
    const house = {
        id: SnowFlake.next(),
        projectId: projectId,
        parentId: parentId,
        houseFormat: houseFormat,
        code: code,
        geoLocation: locationId,
        createdAt: moment().unix(),
        houseKeeper: houseKeeper,
        desc: desc,
        status: status,
        config: config
    };
    return house;
};

exports.CreateSole = (layoutId, houseId, group, building, unit, roomNumber, currentFloor, totalFloor)=>{
    const sole = {
        layoutId: layoutId,
        houseId: houseId,
        group: group,
        building: building,
        unit: unit,
        roomNumber: roomNumber,
        currentFloor: currentFloor,
        totalFloor: totalFloor,
    };
    return sole;
};

exports.CreateLayout = (houseId, roomArea, name, bedRoom, livingRoom, bathRoom, orientation, remark)=>{
    const layout = {
        id: SnowFlake.next(),
        houseId: houseId,
        name: name,
        bedRoom: bedRoom,
        livingRoom: livingRoom,
        bathRoom: bathRoom,
        orientation: orientation,
        roomArea: roomArea,
        remark: remark,
    };
    return layout;
};