'use strict';
const fp = require('lodash/fp');
const common = Include('/services/v1.0/common');
const moment = require('moment');
/**
 * Operations on /houses/{hid}
 */

module.exports = {
    /**
     * summary: get specified houses by hid
     * description: pass hid or query parameter to get houese list

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
            const query = req.query;
            const params = req.params;

            const id = params.houseId;
            const projectId = params.projectId;

            if(!Util.ParameterCheck(query,
                ['houseFormat']
            )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            const houseIns = await MySQL.Houses.findOne({
                where: {
                    id: id,
                    projectId: projectId
                },
                subQuery: false,
                include: [
                    {
                        model: MySQL.Building, as: 'building'
                        , include:[{
                            model: MySQL.GeoLocation, as: 'location'
                        }]
                        , attributes: ['group', 'building', 'unit']
                    },
                    {model: MySQL.Layouts, as: 'layouts', attributes: ['id', 'name','bedRoom', 'livingRoom', 'bathRoom', 'orientation', 'roomArea', 'remark']},
                    {model: MySQL.Rooms, as: 'rooms', attributes:['config', 'name', 'people', 'type', 'roomArea', 'orientation']},
                    {
                        model: MySQL.HouseDevicePrice,
                        as: 'prices',
                        attributes:['type', 'price']
                    }
                ]
            });
            if(!houseIns){
                return res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
            }

            res.send({
                code: houseIns.code,
                location: houseIns.building.location,
                houseKeeper: houseIns.houseKeeper,
                group: houseIns.building.group,
                building: houseIns.building.building,
                unit: houseIns.building.unit,
                price: houseIns.prices,
                roomNumber: houseIns.roomNumber,
                currentFloor: houseIns.currentFloor,
                totalFloor: houseIns.building.totalFloor,
                layout: houseIns.layouts,
                config: houseIns.config
            });
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
            const houseId = req.params.houseId;
            const projectId = req.params.projectId;

            const isExists = await MySQL.Houses.count({
                where:{
                    id: houseId,
                    deleteAt: 0,
                    projectId: projectId,
                    status: Typedef.HouseStatus.OPEN,
                }
            });
            if(!isExists){
                return res.send(400, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
            }

            const now = moment().unix();
            const rooms = await MySQL.Rooms.findAll({
                where:{
                    houseId: houseId
                },
                include:[
                    {
                        model: MySQL.Contracts,
                        as: 'contracts',
                        where:{
                            to:{$or:[
                                {$eq: 0},
                                {$gte: now}
                            ]}
                        },
                        required: false
                    }
                ]
            });

            const isRoomInUse = fp.compact(fp.map(room=>{
                return common.roomLeasingStatus(room.contracts) !== Typedef.OperationStatus.IDLE ? room.id : null;
            })(rooms));

            if(isRoomInUse.length){
                return res.send(400, ErrorCode.ack(ErrorCode.CONTRACTWORKING));
            }

            let t;
            try {
                t = await MySQL.Sequelize.transaction({autocommit: false});

                const now = moment();
                await MySQL.Houses.update(
                    {
                        deleteAt: now.unix(),
                        status: Typedef.OperationStatus.DELETED
                    },
                    {
                        where: {
                            id: houseId,
                            projectId: projectId
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
                            sourceId: houseId
                        },
                        transaction: t
                    }
                );
                await MySQL.Rooms.destroy(
                    {
                        where:{
                            houseId: houseId
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
            const houseId = params.houseId;

            const houseIns = await MySQL.Houses.findOne({
                where:{
                    id: houseId,
                    projectId: projectId
                }
            });

            if(!houseIns){
                return res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
            }

            const putBody = fp.pick(['location', 'code', 'group', 'building', 'unit',
                    'roomNumber', 'totalFloor', 'currentFloor',
                    'config', 'houseKeeper', 'layout'])(body);

            const SavePrice = async(t, projectId, houseId, prices)=>{

                const housePrices = await MySQL.HouseDevicePrice.findAll({
                    where:{
                        projectId: projectId,
                        sourceId: houseId
                    },
                    attributes: ['id', 'type']
                });

                const bulkInsert = fp.compact(fp.map(price=>{
                    if(Typedef.IsPriceType(price.type)){
                        const housePrice = fp.find({type: price.type})(housePrices);

                        return fp.assignIn({
                            type: price.type,
                            price: price.price,
                            projectId: projectId,
                            sourceId: houseId,
                        })(housePrice ? {id: housePrice.id} : {});
                    }
                })(prices));

                await MySQL.HouseDevicePrice.bulkCreate(bulkInsert, {transaction: t, updateOnDuplicate: true});
            };

            let t;
            try{
                t = await MySQL.Sequelize.transaction({autocommit: false});

                if(body.location) {
                    const newLocation = await common.AsyncUpsertGeoLocation(body.location, t);
                    body.location = MySQL.Plain(newLocation[0]);
                }

                if(!fp.isEmpty(putBody)) {
                    await MySQL.Houses.update(
                        putBody,
                        {
                            where: {
                                id: houseId,
                                projectId: projectId,
                            },
                            transaction: t
                        }
                    );

                    await MySQL.Building.update(
                        putBody,
                        {
                            where: {
                                id: houseIns.buildingId,
                                projectId: projectId
                            },
                            transaction: t
                        }
                    );

                    await MySQL.Layouts.update(
                        putBody.layout,
                        {
                            where: {
                                id: body.layout.id,
                                sourceId: houseId
                            },
                            transaction: t
                        }
                    );
                }

                if(body.prices) {
                    await SavePrice(t, projectId, houseId, body.prices);
                }

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
