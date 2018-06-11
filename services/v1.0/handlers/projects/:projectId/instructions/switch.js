'use strict';
/**
 * Operations devices in room
 */
const fp = require('lodash/fp');
const moment = require('moment');
const common = Include('/services/v1.0/common');

const makeSwitchMessage = (devices, mode)=>{
  return {
    timestamp: moment().unix(),
    messageTypeId: 7200,
    type: 500,
    param: fp.map(device=>{
      const deviceId = device.deviceId || device.device.deviceId;
      return {
        buildingid:common.getBuildingId(deviceId),
        addrid: common.getAddrId(deviceId),
        id: SnowFlake.next(),
        driver: device.driver || device.device.driver,
        deviceId: deviceId,
        command: 'EMC_SWITCH',
        mode: mode,
        param: {
          mode: mode
        }
      };
    })(devices)
  };
};

module.exports = {
  patch: (req, res)=>{
    /**
         * roomId=xx
         * mode=EMC_ON/EMC_OFF
         */
    const body = req.body;
    if(!Util.ParameterCheck(body, ['roomId|deviceIds', 'mode'])){
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
    }

    const projectId = req.params.projectId;
    const roomId = body.roomId;
    const deviceIds = body.deviceIds;
    const mode = body.mode;

    if( !Typedef.DriverCommand[mode] ){
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
    }

    if(roomId){
      //
      MySQL.HouseDevices.findAll({
        where:{
          projectId: projectId,
          sourceId: roomId,
          endDate: 0
        },
        include:[
          {
            model: MySQL.Devices,
            as: 'device'
          }
        ]
      }).then(
        devices=>{
          const evt = makeSwitchMessage(devices, mode);
          Message.Collector.send(evt);
          res.send(202);
        },
        err=>{
          log.error(err, roomId, mode);
          res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        }
      );
    }
    else if(deviceIds){
      MySQL.Devices.findAll({
        where:{
          projectId: projectId,
          deviceId:{$in: deviceIds}
        }
      }).then(
        devices=>{
          const evt = makeSwitchMessage(devices, mode);
          Message.Collector.send(evt);
          res.send(202);
        },
        err=>{
          log.error(err, roomId, mode);
          res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        }
      );
    }
    else{
      //
    }



  }
};
