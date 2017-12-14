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

function PutEntire(projectId, id, body) {
    return new Promise((resolve, reject)=>{
        //
        (async()=>{
            const putBody = _.pick(body, ['location', 'enabledFloors', 'config', 'layout']);
            const entire = await MySQL.Entire.findOne({
                where: {
                    projectId: projectId,
                    id: id
                }
            });
            if (!entire) {
                return reject(ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
            }

            //enabledFloors
            let removeFloors = [];
            let enableFloors = [];
            {
                const oldEnabledFloors = entire.enabledFloors;
                const nowEnabledFloors = putBody.enabledFloors;
                for (let i = 1; i < entire.totalFloor; i++) {
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
                const inUseCount = await MySQL.Soles.count({
                    where: {
                        currentFloor: {$in: removeFloors},
                        projectId: projectId,
                        entireId: id,
                        status: Typedef.OperationStatus.INUSE
                    }
                });
                if (inUseCount) {
                    return reject(ErrorCode.ack(ErrorCode.CONTRACTWORKING));
                }
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

                if (removeFloors) {
                    MySQL.Soles.update(
                        {status: Typedef.OperationStatus.CLOSED},
                        {
                            where: {
                                projectId: projectId,
                                entireId: id,
                                currentFloor: {$in: removeFloors}
                            },
                            transaction: t
                        }
                    );
                }
                if (enableFloors) {
                    MySQL.Soles.update(
                        {status: Typedef.OperationStatus.IDLE},
                        {
                            where: {
                                projectId: projectId,
                                entireId: id,
                                currentFloor: {$in: enableFloors}
                            },
                            transaction: t
                        }
                    )
                }

                const now = moment();
                if (removeLayoutIds) {
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
                if (addLayout) {
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
                await MySQL.Entire.update(
                    updateEntire,
                    {
                        where: {
                            id: id,
                            projectId: projectId
                        }
                    }
                );

                await t.commit();
                resolve(ErrorCode.ack(ErrorCode.OK));
            }
            catch(e){
                log.error(e, projectId, id, body);
                reject(ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        })();
    });
}
function PutSole(projectId, id, body) {
    return new Promise((resolve, reject)=>{
        //
        (async()=>{
            const putBody = _.pick(body
                , ['location', 'group', 'building', 'unit',
                    'roomNumber', 'totalFloor', 'currentFloor',
                    'config', 'houseKeeper', 'layout']
            );

            if(!Util.ParameterCheck(putBody.layout,
                    ['id']
                )){
                return reject(ErrorCode.ack(ErrorCode.PARAMETERMISSED, 'layout.id missed'));
            }

            try {
                const sole = await MySQL.Soles.findOne({
                    where: {
                        projectId: projectId,
                        id: id,
                        houseFormat: Typedef.HouseFormat.SOLE
                    }
                });
                if (!sole) {
                    return reject(ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
                }

                const sameSoleCount = await MySQL.Soles.count({
                    where:{
                        geoLocation: putBody.location.id,
                        group: putBody.group,
                        building: putBody.building,
                        unit: putBody.unit,
                        roomNumber: putBody.roomNumber,
                    }
                });
                if(sameSoleCount>1){
                    return reject(ErrorCode.ack(ErrorCode.BUILDINGEXISTS));
                }

                const t = await MySQL.Sequelize.transaction();

                await MySQL.Layouts.update(
                    putBody.layout,
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
                        where: {
                            id: id,
                            projectId: projectId
                        }
                    }
                );

                await t.commit();
                resolve(ErrorCode.ack(ErrorCode.OK));
            }
            catch(e){
                log.error(e, projectId, id, body);
                reject(ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        })();
    });
}
function PutShare(projectId, id, body) {
    return new Promise((resolve, reject)=>{
        //
        (async()=>{
            const putBody = _.pick(body
                , ['location', 'group', 'building', 'unit',
                    'roomNumber', 'totalFloor', 'currentFloor',
                    'config', 'houseKeeper', 'layout']
            );

            if(!Util.ParameterCheck(putBody.layout,
                    ['id']
                )){
                return reject(ErrorCode.ack(ErrorCode.PARAMETERMISSED, 'layout.id missed'));
            }

            try {
                const sole = await MySQL.Soles.findOne({
                    where: {
                        projectId: projectId,
                        id: id,
                        houseFormat: Typedef.HouseFormat.SHARE
                    }
                });
                if (!sole) {
                    return reject(ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
                }

                const sameSoleCount = await MySQL.Soles.count({
                    where:{
                        geoLocation: putBody.location.id,
                        group: putBody.group,
                        building: putBody.building,
                        unit: putBody.unit,
                        roomNumber: putBody.roomNumber,
                    }
                });
                if(sameSoleCount>1){
                    return reject(ErrorCode.ack(ErrorCode.BUILDINGEXISTS));
                }

                const t = await MySQL.Sequelize.transaction();

                await MySQL.Layouts.update(
                    putBody.layout,
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
                        where: {
                            id: id,
                            projectId: projectId
                        }
                    }
                );

                await t.commit();
                resolve(ErrorCode.ack(ErrorCode.OK));
            }
            catch(e){
                log.error(e, projectId, id, body);
                reject(ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        })();
    });
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
        const houseId = req.params.id;

        MySQL.Houses.update(
            {
                deleteAt: moment().unix(),
                status: Typedef.OperationStatus.DELETE
            },
            {
                where:{
                    id: houseId
                }
            }
        ).then(
            result=>{
                res.send(ErrorCode.ack(ErrorCode.OK));
            },
            err=>{
                log.error(err, houseId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        );
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
        const body = req.body;
        const params = req.params;

        const projectId = params.projectId;

        if(!Util.ParameterCheck(body,
                ['id', 'houseFormat']
            )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        let promise;
        switch(body.houseFormat){
            case Typedef.HouseFormat.ENTIRE:
                promise = PutEntire(projectId, params.id, body);
                break;
            case Typedef.HouseFormat.SOLE:
                promise = PutSole(projectId, params.id, body);
                break;
            case Typedef.HouseFormat.SHARE:
                promise = PutShare(projectId, params.id, body);
                break;
        }

        if(!promise){
            return res.send(500, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
        }

        promise.then(
            resolve=>{
                res.send(resolve);
            },
            err=>{
                res.send(422, err)
            }
        );
    }
};
