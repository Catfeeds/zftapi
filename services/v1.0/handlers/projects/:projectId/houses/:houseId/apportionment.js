'use strict';

const _ = require('lodash');
const fp = require('lodash/fp');
const common = Include('/services/v1.0/common');

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
            res.send( common.autoApportionment(projectId, houseId) );
        }
        else{
            //default mode is MANUAL
            //check percent
            const totalPercent = _.sum( fp.map(item=>{return item.value;})(body) );
            if(totalPercent !== 100){
                return res.send(403, ErrorCode.ack(ErrorCode.PARAMETERERROR));
            }

            const roomIds = fp.map(item=>{return item.roomId;})(body);
            //check room in house
            try{
                const roomsCount = await MySQL.Rooms.count({
                    where:{
                        houseId: houseId,
                        id: {$in: roomIds}
                    }
                });
                if (roomsCount !== roomIds.length ) {
                    return res.send(403, ErrorCode.ack(ErrorCode.ROOMNOTMATCH));
                }

                const count = await MySQL.Contracts.count({
                    where: {
                        roomId: {$in: roomIds},
                        status: Typedef.ContractStatus.ONGOING
                    }
                });

                if (count !== roomIds.length) {
                    return res.send(403, ErrorCode.ack(ErrorCode.CONTRACTNOTEXISTS));
                }
            }
            catch(e){
                log.error(e, projectId, houseId, body);
                return res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }

            try {
                const apportionmentMapping = _.fromPairs(fp.map(item=>{ return [item.roomId, item.value];})(body));

                const apportionments = await MySQL.HouseApportionment.findAll({
                    where: {
                        houseId: houseId
                    }
                });

                const updateApportionments = _.assign(_.compact(fp.map(apportionment=>{
                    if( _.includes(roomIds, apportionment.roomId) ){
                        apportionment.value = apportionmentMapping[apportionment.roomId];
                        return apportionment;
                    }
                })(apportionments)),
                    fp.map(item=>{
                        return _.assign(item, {projectId: projectId, houseId: houseId});
                    })(body)
                );

                const deleteApportionments = _.compact(fp.map(apportionment=>{
                    if( !_.includes(roomIds, apportionment.roomId) ){
                        return apportionment.id;
                    }
                    return null;
                })(apportionments));

                const t = await MySQL.Sequelize.transaction();

                await MySQL.HouseApportionment.bulkCreate(updateApportionments ,{transaction: t, updateOnDuplicate: true});

                await MySQL.HouseApportionment.destroy({where:{ id:{$in: deleteApportionments}}, transaction: t});

                await t.commit();

                res.send(204);
            }
            catch(e){
                log.error(e, projectId, houseId, body);
                return res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        }
    }
};
