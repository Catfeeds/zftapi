'use strict';

const moment = require('moment');

/**
 * Operations on /rooms/{hid}
 */
module.exports = {
    post: (req, res, next)=>{
        //
        (async()=>{
            const projectId = req.params.projectId;
            const body = req.body;

            if(!Util.ParameterCheck(body,
                    ['id']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            const now = moment();
            const sole = await MySQL.Soles.findOne({
                where:{
                    id: body.id,
                    projectId: projectId,
                    houseFormat: Typedef.HouseFormat.SHARE
                }
            });
            if(!sole){
                return res.send(ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
            }

            const newRoom = {
                id: SnowFlake.next(),
                projectId: sole.projectId,
                soleId: sole.id,
                createdAt: now.unix(),
                status: Typedef.OperationStatus.IDLE,
                config: []
            };

            const t = await MySQL.Sequelize.transaction();
            await MySQL.Rooms.create(newRoom, {transaction: t});

            const layout = await MySQL.Layouts.create({
                id: SnowFlake.next(),
                houseId: newRoom.id
            }, {transaction: t});

            t.commit();

            newRoom.layout = layout;

            res.send(ErrorCode.ack(ErrorCode.OK, newRoom));
        })();
    }
};
