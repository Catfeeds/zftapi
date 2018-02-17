'use strict';

const fp = require('lodash/fp');
const {autoApportionment} = require('../../../../../common');

/**
 * Operations on /rooms/{hid}
 */
module.exports = {
    get: (req, res)=>{
        const projectId = req.params.projectId;
        const houseId = req.params.houseId;

        MySQL.HouseApportionment.findAll({
            where:{
                projectId: projectId,
                houseId: houseId
            },
            attributes: ['roomId', 'value'],
            include:[
                {
                    model: MySQL.Rooms,
                    as: 'room',
                    attributes: ['type', 'name', 'config', 'orientation', 'roomArea']
                }
            ]
        }).then(
            result=>{
                res.send(result);
            },
            err=>{
                log.error(err, projectId, houseId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        );
    },
    put: async(req ,res)=>{
        const projectId = req.params.projectId;
        const houseId = req.params.houseId;

        const body = req.body;

        const mode = req.query.mode;

        if(mode === 'AUTO'){
            res.send( autoApportionment(projectId, houseId) );
        }
        else{
            //default mode is MANUAL
            //check percent
            const totalPercent = fp.sum(fp.map('value')(body));
            if(totalPercent !== 100){
                return res.send(403, ErrorCode.ack(ErrorCode.PARAMETERERROR));
            }

            const roomIds = fp.map('roomId')(body);
            //check room in house
            try {
                const roomsCount = await MySQL.Rooms.count({
                    where: {
                        houseId: houseId,
                        id: {$in: roomIds},
                    },
                });
                if (roomsCount !== roomIds.length) {
                    return res.send(403, ErrorCode.ack(ErrorCode.ROOMNOTMATCH));
                }

                const count = await MySQL.Contracts.count({
                    where: {
                        roomId: {$in: roomIds},
                        status: Typedef.ContractStatus.ONGOING,
                    },
                });

                if (count !== roomIds.length) {
                    return res.send(403,
                        ErrorCode.ack(ErrorCode.CONTRACTNOTEXISTS));
                }
            }
            catch (e) {
                log.error(e, projectId, houseId, body);
                return res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }

            let t;
            try {
                const apportionmentMapping = fp.fromPairs(
                    fp.map(item => [item.roomId, item.value])(body));

                const apportionments = await MySQL.HouseApportionment.findAll({
                    where: {
                        houseId: houseId,
                    },
                });

                const [toUpdate, toDelete] = fp.partition(
                    rate => fp.includes(rate.roomId)(roomIds))(apportionments);

                const updateApportionments = fp.map(rate => fp.defaults({
                    projectId: projectId,
                    houseId: houseId,
                    value: apportionmentMapping[rate.roomId],
                })(rate))(toUpdate);

                const deleteApportionments = fp.map('id')(toDelete);

                t = await MySQL.Sequelize.transaction({autocommit: false});

                await MySQL.HouseApportionment.bulkCreate(updateApportionments,
                    {transaction: t, updateOnDuplicate: true});

                await MySQL.HouseApportionment.destroy(
                    {where: {id: {$in: deleteApportionments}}, transaction: t});

                await t.commit();

                res.send(204);
            }
            catch (e) {
                await t.rollback();
                log.error(e, projectId, houseId, body);
                return res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        }
    }
};
