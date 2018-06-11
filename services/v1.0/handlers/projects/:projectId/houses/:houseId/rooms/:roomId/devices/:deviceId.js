'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
const moment = require('moment');

module.exports = {
  delete: (req, res)=>{
    //delete both house & room deviceId
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
    const roomId = req.params.roomId;
    const deviceId = req.params.deviceId;

    MySQL.HouseDevices.findAll({
      where:{
        projectId: projectId,
        endDate: 0,
        sourceId:{$in: [houseId, roomId]}
      },
      attributes: ['id', 'deviceId']
    }).then(
      houseDevices=>{
        const currentDevice = fp.find({deviceId})(houseDevices);
        if (fp.isUndefined(currentDevice)) {
          //create
          const now = moment().unix();
          const bulkCreate = [
            // {
            //     projectId: projectId,
            //     sourceId: houseId,
            //     deviceId: deviceId,
            //     startDate: now
            // },
            {
              projectId: projectId,
              sourceId: roomId,
              deviceId: deviceId,
              startDate: now
            }
          ];

          MySQL.HouseDevices.bulkCreate(bulkCreate).then(
            ()=>{
              res.send(201);
            },
            err=>{
              log.error(err, projectId, houseId, deviceId);
              res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
          );
        }
        else{
          res.send(201);
        }
      },
      err=>{
        log.error(err, projectId, houseId, deviceId);
        res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
      }
    );
  }
};
