'use strict';

const moment = require('moment');
const _ = require('lodash');
const fp = require('lodash/fp');

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
            attributes: ['roomId', 'value']
        }).then(
            result=>{
                res.send(result);
            },
            err=>{
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
            const apportionment = common.autoApportionment(projectId, houseId);
        }

        //check percent
        const totalPercent = _.sum( fp.map(item=>{item.value})(body) );
        if(totalPercent !== 100){
            return res.send(403, ErrorCode.ack(ErrorCode.PARAMETERERROR))
        }

        const roomIds = fp.map(item=>{item.roomId})(body);
        //check room in house
        try{
            const roomsCount = await MySQL.Rooms.count({
                where:{
                    houseId: houseId,
                    id: {$in: roomIds}
                }
            });
            if (roomsCount !== roomIds) {
                return res.send(403, ErrorCode.ack(ErrorCode.CONTRACTNOTEXISTS));
            }

            const count = await MySQL.Contracts.count({
                where: {
                    roomId: {$in: roomIds},
                    status: Typedef.ContractStatus.ONGOING
                }
            });

            if (count !== roomIds) {
                return res.send(403, ErrorCode.ack(ErrorCode.CONTRACTNOTEXISTS));
            }
        }
        catch(e){
            log.error(e, projectId, houseId, body);
            return res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        }

        const apportionmentMapping = _.fromPairs(fp.map(item=>{[item.roomId, item.value]})(body));
        try {
            const apportionments = await MySQL.HouseApportionment.findAll({
                where: {
                    houseId: houseId
                }
            });
        }
        catch(e){
            log.error(e, projectId, houseId, body);
            return res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        }

        const updateApportionments = _.compact(fp.map(apportionment=>{
            if( _.includes(roomIds, apportionment.roomId) ){
                apportionment.value = apportionmentMapping[apportionment.roomId];
                return apportionment;
            }
            return null;
        }));

        const deleteApportionments = _.compact(fp.map(apportionment=>{
            if( !_.includes(roomIds, apportionment.roomId) ){
                return apportionment.id;
            }
            return null;
        }));


        try{
            const t = await MySQL.Sequelize.transaction();

            await MySQL.HouseApportionment.bulkCreate(updateApportionments ,{transaction: t, updateOnDuplicate: true});

            await MySQL.HouseApportionment.destroy({where:{ id:{$in: deleteApportionments}}, transaction: t});

            res.send(204);
        }
        catch(e){
            log.error(e, projectId, houseId, body);
            return res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        }
    }
};
