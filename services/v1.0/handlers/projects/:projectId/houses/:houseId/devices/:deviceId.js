'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
const _ = require('lodash');
const moment = require('moment');
const common = Include("/services/v1.0/common");

module.exports = {
    /**
     * remove house device bind relationship
     */
    delete: (req, res)=>{
        const params = req.params;
        const body = req.body;

        const projectId = params.projectId;
        const houseId = params.houseId;
        const deviceId = params.deviceId;

        MySQL.HouseDevices.update(
            {
                endDate: moment().unix()
            },
            {
                where:{
                    projectId: projectId,
                    sourceId: houseId,
                    deviceId: deviceId,
                    endDate: 0
                }
            }
        ).then(
            ()=>{
                res.send(204);
            },
            err=>{
                log.error(err, projectId, houseId, deviceId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        );
    },
    put: (req, res)=>{
        const projectId = req.params.projectId;
        const houseId = req.params.houseId;
        const deviceId = req.params.deviceId;
        const body = req.body;

        (async()=>{
            const houseDevices = await MySQL.HouseDevices.findAll({
                where:{
                    projectId: projectId,
                    sourceId: houseId,
                },
                attributes: ['id', 'deviceId']
            });

            const index = _.findIndex(houseDevices, (houseDevice)=>{
                return houseDevice.deviceId === deviceId
            });
            try {
                const t = await MySQL.Sequelize.transaction();

                if (index === -1) {
                    //create
                    await MySQL.HouseDevices.create({
                        projectId: projectId,
                        sourceId: houseId,
                        deviceId: deviceId,
                        startDate: moment().unix(),
                        public: body.public
                    },{transaction: t});
                }

                await t.commit();

                res.send(201);
            }
            catch(e){
                log.error(e, projectId, houseId, deviceId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }

        })();
    }
};
