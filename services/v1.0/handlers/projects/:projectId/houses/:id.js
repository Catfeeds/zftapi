'use strict';
const common = Include("/services/v1.0/common");
const _ = require('lodash');
const moment = require('moment');
/**
 * Operations on /houses/{hid}
 */

async function GetEntire(projectId, id) {
    try {
        let entireIns = await MySQL.Houses.findOne({
            where: {
                id: id,
                projectId: projectId
            }
        });
        entireIns.config;
        entireIns = MySQL.Plain(entireIns);
        const layouts = await MySQL.Layouts.findAll({
            where: {
                houseId: id
            }
        });
        entireIns.layout = layouts;

        const location = await MySQL.GeoLocation.findOne({
            where:{
                id: entireIns.geoLocation
            }
        });
        entireIns.location = MySQL.Plain(location);

        const entire = await MySQL.Entire.findOne({
            where:{
                houseId: entireIns.id
            },
            attributes: ['totalFloor', 'roomCountOnFloor', 'enabledFloors']
        });
        entireIns = _.assignIn(entireIns, MySQL.Plain(entire) );

        return entireIns;
    }
    catch(e){
        log.error(e, projectId, id);
    }
}
async function GetSole(projectId, id) {
    try {
        let house = await MySQL.Houses.findOne({
            where: {
                id: id,
                projectId: projectId,
                houseFormat: Typedef.HouseFormat.SOLE
            }
        });
        house.config;
        house = MySQL.Plain(house);
        const layout = await MySQL.Layouts.findOne({
            where: {
                houseId: id
            }
        });
        house.layout = layout;

        const location = await MySQL.GeoLocation.findOne({
            where:{
                id: house.geoLocation
            }
        });
        house.location = MySQL.Plain(location);

        const sole = await MySQL.Soles.findOne({
            where:{
                houseId: house.id
            },
            attributes: ['layoutId', 'group', 'building', 'unit', 'roomNumber', 'currentFloor', 'totalFloor']
        });
        house = _.assignIn(house, MySQL.Plain(sole) );

        return house
    }
    catch(e){
        log.error(e, projectId, id);
    }
}
async function GetShare(projectId, id) {
    try {
        let share = await MySQL.Houses.findOne({
            where: {
                id: id,
                projectId: projectId,
                houseFormat: Typedef.HouseFormat.SHARE
            }
        });
        if(!share){
            return ErrorCode.ack(ErrorCode.REQUESTUNMATCH);
        }
        share.config;
        share = MySQL.Plain(share);
        const layout = await MySQL.Layouts.findOne({
            where: {
                houseId: id
            }
        });
        share.layout = layout;

        const location = await MySQL.GeoLocation.findOne({
            where:{
                id: share.geoLocation
            }
        });
        share.location = MySQL.Plain(location);

        return share;
    }
    catch(e){
        log.error(e, projectId, id);
    }
}

async function PutEntire(projectId, id, body) {
    const putBody = _.pick(body, ['location', 'enabledFloors', 'config', 'layout']);
    const entire = await MySQL.Houses.findOne({
        where: {
            projectId: projectId,
            id: id
        },
        include:[
            {
                model: MySQL.Entire
            }
        ]
    });

    if (!entire) {
        throw Error(ErrorCode.REQUESTUNMATCH);
    }

    //enabledFloors
    let removeFloors = [];
    let enableFloors = [];
    let removeFloorHouseIds = [];
    let enableFloorHouseIds = [];
    if(putBody.enabledFloors){
        const oldEnabledFloors = entire.entire.enabledFloors;
        const nowEnabledFloors = putBody.enabledFloors;
        for (let i = 1; i < entire.entire.totalFloor; i++) {
            const compare = (v) => {
                return v === i
            };
            const existsInOld = _.findIndex(oldEnabledFloors, compare);
            const existsInNow = _.findIndex(nowEnabledFloors, compare);
            if (existsInOld !== -1 && existsInNow === -1) {
                //floor has been removed
                removeFloors.push(i);
            }
            else if (existsInOld === -1 && existsInNow !== -1) {
                enableFloors.push(i);
            }
        }

        const isContractWorking = await MySQL.Houses.count({
            where: {
                projectId: projectId,
                parentId: id,
                status: Typedef.OperationStatus.INUSE
            },
            attributes: ['id'],
            include:[
                {
                    model: MySQL.Soles,
                    where:{
                        currentFloor: {$in: removeFloors},
                    }
                }
            ]
        });
        if (isContractWorking.length) {
            throw Error(ErrorCode.CONTRACTWORKING);
        }

        const removeHouses = await MySQL.Houses.findAll({
            where: {
                projectId: projectId,
                parentId: id,
                status: Typedef.OperationStatus.IDLE
            },
            attributes: ['id'],
            include:[
                {
                    model: MySQL.Soles,
                    where:{
                        currentFloor: {$in: removeFloors},
                    }
                }
            ]
        });
        removeHouses.map(house=>{ removeFloorHouseIds.push(house.id) });
        const enableHouses = await MySQL.Houses.findAll({
            where: {
                projectId: projectId,
                parentId: id,
                status: Typedef.OperationStatus.DELETED
            },
            attributes: ['id'],
            include:[
                {
                    model: MySQL.Soles,
                    where:{
                        currentFloor: {$in: enableFloors},
                    }
                }
            ]
        });
        enableHouses.map(house=>{ enableFloorHouseIds.push(house.id) });
    }

    //
    let removeLayoutIds = [];
    let addLayout = [];
    if (putBody.layout) {
        const nowLayouts = putBody.layout;
        const oldLayouts = await MySQL.Layouts.findAll({
            where: {
                houseId: id,
                deleteAt: 0
            }
        });

        oldLayouts.map(layout => {
            const isExists = _.findKey(nowLayouts, (nowLayout) => {
                return nowLayout.id === layout.id
            });
            if (!isExists) {
                removeFloors.push(layout.id);
            }
        });
        nowLayouts.map(layout => {
            if (!layout.id) {
                layout.id = SnowFlake.next();
                layout.houseId = entire.id;
                addLayout.push(layout);
            }
        });
    }

    try {
        const t = await  MySQL.Sequelize.transaction();

        if (removeFloors && removeFloorHouseIds.length) {
            await MySQL.Houses.update(
                {status: Typedef.OperationStatus.CLOSED},
                {
                    where: {
                        projectId: projectId,
                        parentId: id,
                        id:{$in: removeFloorHouseIds}
                    },
                    transaction: t
                }
            );
        }
        if (enableFloors && enableFloorHouseIds.length) {
            await MySQL.Houses.update(
                {status: Typedef.OperationStatus.IDLE},
                {
                    where: {
                        projectId: projectId,
                        parentId: id,
                        id:{$in: enableFloorHouseIds}
                    },
                    transaction: t
                }
            )
        }

        const now = moment();
        if (removeLayoutIds && removeLayoutIds.length) {
            await MySQL.Layouts.update(
                {deleteAt: now.unix()},
                {
                    where: {
                        id: {$in: removeLayoutIds}
                    },
                    transaction: t
                }
            )
        }
        if (addLayout && addLayout.length) {
            await MySQL.Layouts.bulkCreate(addLayout, {transaction: t});
        }

        let updateEntire = {
            config: putBody.config,
            enabledFloors: putBody.enabledFloors
        };
        if (putBody.location && entire.geoLocation !== putBody.location.id) {
            // update location
            const location = await common.AsyncUpsertGeoLocation(putBody.location, t);
            updateEntire.geoLocation = location[0].id;
        }
        await MySQL.Houses.update(
            updateEntire,
            {
                where: {
                    id: id,
                    projectId: projectId
                },
                transaction: t
            }
        );
        await MySQL.Entire.update(
            updateEntire,
            {
                where:{
                    houseId: id
                },
                transaction: t
            }
        );

        await t.commit();
    }
    catch(e){
        log.error(e, projectId, id, body);
    }
}
async function PutSole(projectId, id, body) {
    const putBody = _.pick(body
        , ['location', 'group', 'building', 'unit',
            'roomNumber', 'totalFloor', 'currentFloor',
            'config', 'houseKeeper', 'layout']
    );

    if(!Util.ParameterCheck(putBody.layout,
            ['id']
        )){
        throw Error(ErrorCode.PARAMETERMISSED);
    }

    try {
        const sole = await MySQL.Houses.findOne({
            where: {
                projectId: projectId,
                id: id,
                houseFormat: Typedef.HouseFormat.SOLE
            }
        });
        if (!sole) {
            throw Error(ErrorCode.REQUESTUNMATCH);
        }

        const sameSoleCount = await MySQL.Houses.count({
            where:{
                geoLocation: putBody.location.id
            },
            include:[
                {
                    model: MySQL.Soles,
                    where:{
                        group: putBody.group,
                        building: putBody.building,
                        unit: putBody.unit,
                        roomNumber: putBody.roomNumber,
                    }
                }
            ]
        });
        if(sameSoleCount>1){
            throw Error(ErrorCode.BUILDINGEXISTS);
        }

        const t = await MySQL.Sequelize.transaction();

        let putLayout = _.pick(putBody.layout,['name', 'bedRoom', 'livingRoom', 'bathRoom', 'orientation', 'roomArea', 'remark']);
        await MySQL.Layouts.update(
            putLayout,
            {
                where:{
                    id: putBody.layout.id
                }
            }
        );

        let updateSole = {
            group: putBody.group,
            building: putBody.building,
            unit: putBody.unit,
            roomNumber: putBody.roomNumber,
            totalFloor: putBody.totalFloor,
            currentFloor: putBody.currentFloor,
            houseKeeper: putBody.houseKeeper,
        };
        if (putBody.location && sole.geoLocation !== putBody.location.id) {
            // update location
            const location = await common.AsyncUpsertGeoLocation(putBody.location, t);
            updateSole.geolocation = location[0].id;
        }

        await MySQL.Soles.update(
            updateSole,
            {
                where:{
                    houseId: id
                }
            }
        );

        await MySQL.Houses.update(
            updateSole,
            {
                where: {
                    id: id,
                    projectId: projectId
                }
            }
        );

        await t.commit();
    }
    catch(e){
        log.error(e, projectId, id, body);
    }
}
async function PutShare(projectId, id, body) {
    const putBody = _.pick(body
        , ['location', 'group', 'building', 'unit',
            'roomNumber', 'totalFloor', 'currentFloor',
            'config', 'houseKeeper', 'layout']
    );

    if(!Util.ParameterCheck(putBody.layout,
            ['id']
        )){
        throw Error(ErrorCode.PARAMETERMISSED);
    }

    try {
        const sole = await MySQL.Houses.findOne({
            where: {
                projectId: projectId,
                id: id,
                houseFormat: Typedef.HouseFormat.SHARE
            }
        });
        if (!sole) {
            throw Error(ErrorCode.REQUESTUNMATCH);
        }

        const sameSoleCount = await MySQL.Houses.count({
            where: {
                geoLocation: putBody.location.id
            },
            include:[
                {
                    model: MySQL.Soles,
                    where:{
                        group: putBody.group,
                        building: putBody.building,
                        unit: putBody.unit,
                        roomNumber: putBody.roomNumber,
                    }
                }
            ]
        });
        if(sameSoleCount>1){
            throw Error(ErrorCode.BUILDINGEXISTS);
        }

        const t = await MySQL.Sequelize.transaction();

        let putLayout = _.pick(putBody.layout,['name', 'bedRoom', 'livingRoom', 'bathRoom', 'orientation', 'roomArea', 'remark']);
        await MySQL.Layouts.update(
            putLayout,
            {
                where:{
                    id: putBody.layout.id
                }
            }
        );

        let updateSole = {
            group: putBody.group,
            building: putBody.building,
            unit: putBody.unit,
            roomNumber: putBody.roomNumber,
            totalFloor: putBody.totalFloor,
            currentFloor: putBody.currentFloor,
            houseKeeper: putBody.houseKeeper,
        };
        if (putBody.location && sole.geoLocation !== putBody.location.id) {
            // update location
            const location = await common.AsyncUpsertGeoLocation(putBody.location, t);
            updateSole.geoLocation = location[0].id;
        }

        await MySQL.Soles.update(
            updateSole,
            {
                where:{
                    houseId: id
                }
            }
        );

        await MySQL.Houses.update(
            updateSole,
            {
                where: {
                    id: id,
                    projectId: projectId
                }
            }
        );

        await t.commit();
    }
    catch(e){
        log.error(e, projectId, id, body);
    }
}

module.exports = {
    /**
     * summary: get specified houses by hid
     * description: pass hid or query parameter to get houese list

     * parameters: hid
     * produces: application/json
     * responses: 200, 400
     */
    get: (req, res, next)=>{
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        (async()=>{
            const query = req.query;
            const params = req.params;

            const id = params.id;
            const projectId = params.projectId;

            if(!Util.ParameterCheck(query,
                    ['houseFormat']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            let result;
            try {
                switch (query.houseFormat) {
                    case Typedef.HouseFormat.ENTIRE:
                        result = await GetEntire(projectId, id);
                        break;
                    case Typedef.HouseFormat.SOLE:
                        result = await GetSole(projectId, id);
                        break;
                    case Typedef.HouseFormat.SHARE:
                        result = await GetShare(projectId, id);
                        break;
                }
                res.send(result);
            }
            catch(e){
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        })();
    },
    /**
     * summary: delete house
     * description: save house information

     * parameters: hid
     * produces: application/json
     * responses: 200, 400, 405, 410
     */
    delete: function deleteHouse(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        (async()=>{
            const houseId = req.params.id;

            try {
                const t = await MySQL.Sequelize.transaction();

                const now = moment();
                await MySQL.Houses.update(
                    {
                        deleteAt: now.unix(),
                        status: Typedef.OperationStatus.DELETE
                    },
                    {
                        where: {
                            id: houseId
                        },
                        transaction: t
                    }
                );
                await MySQL.Layouts.update(
                    {
                        deleteAt: now.unix(),
                    },
                    {
                        where:{
                            houseId: houseId
                        },
                        transaction: t
                    }
                );
                await t.commit();
                res.send();
            }
            catch(e){
                log.error(e, houseId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        })();
    },
    /**
     * summary: update house
     * description: save house information

     * parameters: hid, body
     * produces: application/json
     * responses: 200, 400
     */
    put: function updateHouse(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        (async()=>{
            const body = req.body;
            const params = req.params;

            const projectId = params.projectId;

            if(!Util.ParameterCheck(body,
                    ['id', 'houseFormat']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            let result;
            try {
                switch (body.houseFormat) {
                    case Typedef.HouseFormat.ENTIRE:
                        result = await PutEntire(projectId, params.id, body);
                        break;
                    case Typedef.HouseFormat.SOLE:
                        result = await PutSole(projectId, params.id, body);
                        break;
                    case Typedef.HouseFormat.SHARE:
                        result = await PutShare(projectId, params.id, body);
                        break;
                }

                res.send();
            }
            catch(e){
                log.error(ErrorCode.ack(e.message), params, body);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        })();
    }
};
