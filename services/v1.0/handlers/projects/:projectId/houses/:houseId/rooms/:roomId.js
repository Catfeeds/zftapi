'use strict';

const _ = require('lodash');
const moment = require('moment');

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
                await MySQL.Rooms.update(
                    {
                        deletedAt: moment().unix()
                    },
                    {
                        where:{
                            id: id,
                            houseId: houseID,
                            deletedAt: 0
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

            const putBody = _.pick(body, ['name', 'type', 'roomArea', 'config', 'orientation', 'status']);

            // const room = await MySQL.Rooms.findOne({
            //     where:{
            //         id: roomId
            //     },
            //     include:[
            //         {
            //             model: MySQL.Contracts,
            //             as: 'contracts',
            //             where:{
            //                 from:
            //             }
            //         }
            //     ]
            // });
            //
            // if(!room){
            //     return res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
            // }



            const t = await MySQL.Sequelize.transaction();

            await MySQL.Rooms.update(
                putBody,
                {
                    where:{
                        projectId: projectId,
                        id: id
                    },
                    transaction: t
                }
            );

            await MySQL.Layouts.update(
                putBody.layout,
                {
                    where:{
                        id: putBody.layout.id
                    },
                    transaction: t
                }
            );

            t.commit();

            res.send(ErrorCode.ack(ErrorCode.OK));

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
