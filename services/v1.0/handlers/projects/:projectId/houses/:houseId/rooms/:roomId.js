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
            const id = req.params.id;

            try {
                const houseIns = await MySQL.Houses.findOne({
                    where:{
                        id: id,
                        projectId: projectId,
                        deleteAt: 0
                    },
                    attributes:['id', 'parentId', 'houseFormat']
                });
                if( houseIns.parentId === 0 && houseIns.houseFormat !== Typedef.HouseFormat.SOLE ){
                    return;
                }

                const t = await MySQL.Sequelize.transaction();

                await MySQL.Houses.update(
                    {deleteAt: moment().unix()},
                    {
                        where: {
                            id: id
                        },
                        transaction: t
                    }
                );

                await MySQL.Layouts.update(
                    {deleteAt: moment().unix()},
                    {
                        where: {
                            houseId: id,
                        },
                        transaction: t
                    }
                );

                t.commit();

                res.send();
            }
            catch(e){
                log.error(e, projectId, id);
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
            const id = req.params.id;
            const body = req.body;

            if( body.layout && !Util.ParameterCheck(body.layout,
                    ['id']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            const putBody = _.pick(body, ['name', 'type', 'desc', 'config', 'layout']);

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
