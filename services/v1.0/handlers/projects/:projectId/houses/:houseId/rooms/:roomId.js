'use strict';

const _ = require('lodash');
const moment = require('moment');
const common = Include("/services/v1.0/common");

/**
 * Operations on /rooms/{hid}
 */
module.exports = {
    /**
     * summary: delete room
     * description: save house information

     * parameters: hid
     * produces: application/json
     * responses: 200, 400
     */
    delete: function deleteRoom(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */

        (async()=>{
            const projectId = req.params.projectId;
            const houseID = req.params.houseId;
            const id = req.params.roomId;

            try {
                await MySQL.Rooms.destroy(
                    {
                        where:{
                            id: id,
                            houseId: houseID,
                        }
                    }
                );

                res.send();
            }
            catch(e){
                if(e.original.errno === 1065){
                    res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
                }
                else {
                    log.error(e, projectId, houseID, id);
                    res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
                }
            }
        })();
    },
    /**
     * summary: update room
     * description: save house information

     * parameters: hid
     * produces: application/json
     * responses: 200, 400
     */
    put: function updateRoom(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        (async()=>{
            const projectId = req.params.projectId;
            const houseId = req.params.houseId;
            const roomId = req.params.roomId;
            const body = req.body;

            const putBody = _.pick(body, ['name', 'type', 'roomArea', 'config', 'orientation', 'pause', 'reuse']);

            const room = await MySQL.Rooms.findOne({
                where:{
                    houseId: houseId,
                    id: roomId
                },
                include:[
                    {
                        model: MySQL.SuspendingRooms,
                        where:{
                            projectId: projectId,
                            to: 0
                        },
                        order:[ ['createdAt', 'desc'] ],
                        limit: 1
                    }
                ]
            });
            if(!room){
                return res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
            }

            room.status = common.roomLeasingStatus([], room.suspendingRooms);

            if( putBody.pause ) {
                if (room.suspendingRooms.length) {
                    return res.send(403, ErrorCode.ack(ErrorCode.STATUSUNMATCH));
                }
                else {
                    putBody.status = Typedef.OperationStatus.PAUSED;
                }
            }

            if( putBody.reuse ){
                if(!room.suspendingRooms.length) {
                    return res.send(403, ErrorCode.ack(ErrorCode.STATUSUNMATCH));
                }
                else{
                    putBody.status = Typedef.OperationStatus.IDLE;
                }
            }

            try {
                const t = await MySQL.Sequelize.transaction();

                await MySQL.Rooms.update(
                    putBody,
                    {
                        where: {
                            id: roomId,
                            houseId: houseId
                        },
                        transaction: t
                    }
                );

                if(putBody.status === Typedef.OperationStatus.PAUSED){
                    await MySQL.SuspendingRooms.create({
                        id: SnowFlake.next(),
                        projectId: projectId,
                        roomId: roomId,
                        from: moment().unix(),
                        to: 0
                    }, {transaction: t})
                }
                else if( putBody.status === Typedef.OperationStatus.IDLE){
                    await MySQL.SuspendingRooms.destroy({
                        where:{
                            id: room.suspendingRooms[0].id
                        },
                        transaction: t
                    });
                }

                await t.commit();

                res.send();
            }
            catch(e){
                log.error(e, body, putBody);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }

        })();
    },

    get: (req, res, next)=>{
        const roomId = req.params.roomId;
        const projectId =req.params.projectId;

        MySQL.Rooms.findOne({
            where:{
                id: roomId
            },
            include: [
                {
                    model: MySQL.HouseDevices,
                    as: 'devices',
                    required: false,
                    attributes: ['deviceId', "public"],
                    where:{
                        endDate: 0
                    }
                }
            ]
        }).then(
            room=>{
                if(!room){
                    return res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
                }

                res.send(room);
            },
            err=>{
                log.error(err, roomId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        );
    }
};
