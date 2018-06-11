'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');

module.exports = {
  delete: async(req, res)=>{

    const projectId = req.params.projectId;
    const deviceId = req.params.deviceId;

    MySQL.HouseDevices.count({
      where:{
        projectId: projectId,
        deviceId: deviceId,
        endDate: 0
      }
    }).then(
      count=>{
        if(count){
          return res.send(ErrorCode.ack(ErrorCode.DEVICEINBIND));
        }

        MySQL.Devices.destroy({
          where:{
            projectId: projectId,
            deviceId: deviceId
          }
        }).then(
          ()=>{
            res.send(204);
          },
          err=>{
            log.error(err, projectId, deviceId);
            res.send(ErrorCode.ack(ErrorCode.DATABASEEXEC));
          }
        );
      },
      err=>{
        log.error(err, projectId, deviceId);
        res.send(ErrorCode.ack(ErrorCode.DATABASEEXEC));
      }
    );
  },
  put: async(req, res)=>{
    const projectId = req.params.projectId;
    const deviceId = req.params.deviceId;

    const body = fp.pick('memo')(req.body);

    MySQL.Devices.update(
      body
      , {
        where:{
          deviceId: deviceId,
          projectId: projectId
        }
      }
    ).then(
      ()=>{
        res.send(204);
      },
      err=>{
        log.error(err, projectId, deviceId, body);
      }
    );
  }
};
