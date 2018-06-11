'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
const moment = require('moment');

module.exports = {
  /**
     * remove house device bind relationship
     */
  delete: (req, res)=>{
    const params = req.params;

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
          deviceId: deviceId,
          endDate: 0
        },
        attributes: ['id', 'deviceId']
      });
      if(houseDevices && houseDevices.length){
        return res.send(403, ErrorCode.ack(ErrorCode.DUPLICATEREQUEST));
      }

      let t;
      try {
        t = await MySQL.Sequelize.transaction({autocommit: false});
        const current = fp.find(deviceId)(houseDevices);
        if (fp.isUndefined(current)) {
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
        await t.rollback();
        log.error(e, projectId, houseId, deviceId);
        res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
      }

    })();
  }
};
