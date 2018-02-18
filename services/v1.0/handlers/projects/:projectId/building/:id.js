'use strict';
const fp = require('lodash/fp');
const common = Include('/services/v1.0/common');
const moment = require('moment');
/**
 * Operations on /building/{buildingId}
 */

async function getEnabledFloors(buildingId, projectId) {
    const houses = await MySQL.Houses.findAll({
        where:{
            buildingId: buildingId,
            projectId: projectId
        },
        attributes: ['currentFloor', 'status']
    });
    let enabledFloors = [];
    houses.map(house=>{
        //TODO: @joey consider filter
        if(house.status !== Typedef.HouseStatus.CLOSED){
            enabledFloors.push(house.currentFloor);
        }
    });
    enabledFloors = fp.uniq(enabledFloors);
    return enabledFloors;
}

module.exports = {
    /**
     * summary: get specified building by buildingId
     * description: pass hid or query parameter to get building Info

     * parameters: hid
     * produces: application/json
     * responses: 200, 400
     */
    get: (req, res)=>{
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        (async()=>{
            const params = req.params;

            const id = params.id;
            const projectId = params.projectId;

            const building = await MySQL.Building.findOne({
                where:{
                    id: id,
                    projectId: projectId,
                    deleteAt: 0
                },
                include:[
                    {
                        model: MySQL.GeoLocation
                        , as:'location'
                        , attributes: ['id', 'code', 'divisionId', 'district', 'name', 'address', 'longitude', 'latitude']
                    },
                    {
                        model: MySQL.Layouts
                        , as: 'layouts'
                        , attributes: ['id', 'name','bedRoom', 'livingRoom', 'bathRoom', 'orientation', 'roomArea', 'remark']},
                ]
            });
            if(!building){
                return res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
            }

            let enabledFloors = await getEnabledFloors(id, projectId);

            let retBuilding = {
                location: building.location,
                building: {
                    totalFloor: building.totalFloor,
                    houseCountOnFloor: building.houseCountOnFloor,
                    enabledFloors: enabledFloors,
                    config: building.config,
                },
                layouts: building.Layouts
            };
            res.send(retBuilding);
        })();
    },
    /**
     * summary: delete house
     * description: save house information

     * parameters: hid
     * produces: application/json
     * responses: 200, 400, 405, 410
     */
    delete: function deleteHouse(req, res) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        (async()=>{
            const buildingId = req.params.id;
            const projectId = req.params.projectId;

            const houses = await MySQL.Houses.count({
                where:{
                    buildingId: buildingId,
                    projectId: projectId,
                    deleteAt: 0,
                    '$rooms.status$':{$ne: Typedef.OperationStatus.IDLE}
                },
                include:[
                    {
                        model: MySQL.Rooms,
                        as: 'rooms'
                    }
                ]
            });
            if(houses){
                res.send(400, ErrorCode.ack(ErrorCode.CONTRACTWORKING));
            }

            let t;
            try {
                t = await MySQL.Sequelize.transaction({autocommit: false});

                const deleteAt = moment().unix();

                const houseIds = fp.map(house=>{return house.id;})(
                    await MySQL.Houses.findAll({
                        where:{
                            buildingId: buildingId,
                            projectId: projectId
                        },
                        attributes: ['id']
                    })
                );

                await MySQL.Building.update(
                    {
                        deleteAt: deleteAt
                    },
                    {
                        where:{
                            id: buildingId,
                            projectId: projectId
                        }
                    }
                );

                await MySQL.Houses.update(
                    {
                        deleteAt: deleteAt,
                        status: Typedef.OperationStatus.DELETED
                    },
                    {
                        where: {
                            id: {$in: houseIds},
                            projectId: projectId
                        },
                        transaction: t
                    }
                );
                await MySQL.Layouts.update(
                    {
                        deleteAt: deleteAt,
                    },
                    {
                        where:{
                            sourceId: {$in: houseIds}
                        },
                        transaction: t
                    }
                );
                await MySQL.Rooms.destroy(
                    {
                        where:{
                            houseId: {$in: houseIds}
                        },
                        transaction: t
                    }
                );

                await t.commit();
                res.send(201);
            }
            catch(e){
                await t.rollback();
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
    put: function updateHouse(req, res) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        (async()=>{
            const body = req.body;
            const params = req.params;

            const projectId = params.projectId;
            const buildingId = params.id;

            if(!Util.ParameterCheck(body.location, ['code', 'divisionId', 'name', 'district', 'address', 'latitude', 'longitude'])){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            const buildingIns = await MySQL.Building.findOne({
                where:{
                    id: buildingId,
                    projectId: projectId
                }
            });
            if(!buildingIns){
                return res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
            }

            // let enabledFloors = await getEnabledFloors(buildingId, projectId);
            const allFloors = (totalFloor)=>{
                let allFloors = [];
                while(totalFloor){
                    allFloors.push(totalFloor);
                    totalFloor--;
                }
                return allFloors;
            };
            const floors = allFloors(buildingIns.totalFloor);

            const disabledFloors = fp.difference(floors)(body.building.enabledFloors);

            const existsUnMatch = await MySQL.Houses.count({
                where:{
                    buildingId: buildingId,
                    projectId: projectId,
                    currentFloor: {$in: disabledFloors},
                    '$rooms.status$': {$ne: Typedef.OperationStatus.IDLE}
                },
                include:[
                    {model: MySQL.Rooms, as: 'rooms', require: false}
                ]
            });
            if(existsUnMatch){
                return res.send(400, ErrorCode.ack(ErrorCode.CONTRACTWORKING));
            }

            const existsLayoutIds = await MySQL.Layouts.findAll({
                where: {
                    sourceId: buildingId,
                    deleteAt: 0,
                },
                attributes: ['id'],
            });

            let updateLayouts = [];
            let updatedLayoutIds = [];
            body.layouts.map(layout=>{
                //TODO: @joey consider fp.partition
                if(layout.id){
                    if(fp.indexOf(layout.id)(existsLayoutIds) !== -1){
                        updatedLayoutIds.push(layout.id);

                        layout.sourceId = buildingId;
                        updateLayouts.push(layout);
                    }
                }
                else{
                    layout.id = SnowFlake.next();
                    layout.sourceId = buildingId;
                    layout.createdAt = moment().unix();
                    updateLayouts.push(layout);
                }
            });
            const removeLayoutIds = fp.difference(existsLayoutIds)(updatedLayoutIds);

            let t;
            try{
                t = await MySQL.Sequelize.transaction({autocommit: false});

                const newLocation = await common.AsyncUpsertGeoLocation(body.location, t);
                body.location = MySQL.Plain( newLocation[0] );

                await MySQL.Building.update(
                    {
                        config: body.building.config
                    },
                    {
                        where:{
                            id: buildingId,
                            projectId: projectId
                        },
                        transaction: t
                    }
                );

                disabledFloors.length ? await MySQL.Houses.update(
                    {
                        status: Typedef.HouseStatus.CLOSED,
                    },
                    {
                        where:{
                            buildingId: buildingId,
                            projectId: projectId,
                            currentFloor:{$in: disabledFloors}
                        },
                        transaction: t
                    }
                ) : null;
                body.building.enabledFloors.length ? await MySQL.Houses.update(
                    {
                        status: Typedef.HouseStatus.OPEN
                    },
                    {
                        where:{
                            buildingId: buildingId,
                            projectId: projectId,
                            currentFloor:{$in: body.building.enabledFloors}
                        },
                        transaction: t
                    }
                ) : null;

                updateLayouts.length ? await MySQL.Layouts.bulkCreate(updateLayouts, {transaction: t, updateOnDuplicate: true}) : null;
                removeLayoutIds.length ? await MySQL.Layouts.destroy({
                    where:{
                        id:{$in: removeLayoutIds}
                    },
                    transaction: t
                }) : null;

                await t.commit();

                res.send(204);
            }
            catch(e){
                await t.rollback();
                log.error(ErrorCode.ack(e.message), params, body);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        })();
    }
};
