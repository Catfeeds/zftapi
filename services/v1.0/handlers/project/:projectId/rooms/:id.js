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
                const t = await MySQL.Sequelize.transaction();

                await MySQL.Rooms.update(
                    {deleteAt: moment().unix()},
                    {
                        where: {
                            id: id,
                            projectId: projectId
                        },
                        transaction: t
                    }
                );

                await MySQL.Layouts.update(
                    {deleteAt: moment().unix()},
                    {
                        where: {
                            instanceId: id,
                        },
                        transaction: t
                    }
                );

                t.commit();

                res.send(ErrorCode.ack(ErrorCode.OK));
            }
            catch(e){
                log.error(e, projectId, id);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
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
        const roomId = req.params.id;

        MySQL.Rooms.findOne({
            where:{
                id: roomId
            }
        }).then(
            room=>{
                if(!room){
                    return res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
                }

                MySQL.Layouts.findOne({
                    where:{
                        instanceId: room.id
                    }
                }).then(
                    layout=>{
                        if(!layout){
                            return res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
                        }

                        let roomIns = MySQL.Plain(room);
                        roomIns.layout = layout;
                        res.send(ErrorCode.ack(ErrorCode.OK, roomIns));
                    }
                );
            },
            err=>{
                log.error(e, roomId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        );
    }
};
