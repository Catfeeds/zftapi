'use strict';
/**
 * Sync the device reading
 */
const moment = require('moment');
const common = Include('/services/v1.0/common');

module.exports = {
  patch: (req, res)=>{
    /**
         * deviceId=xxx
         */
    const body = req.body;
    if(!Util.ParameterCheck(body, ['deviceId']
    )){
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
    }

    const deviceId = body.deviceId;

    MySQL.Devices.findOne({
      where:{
        deviceId: deviceId
      }
    }).then(
      device=>{
        //
        if(!device){
          return res.send(ErrorCode.ack(ErrorCode.DEVICENOTEXISTS));
        }

        const paramId = SnowFlake.next();
        const evt = {
          timestamp: moment().unix(),
          messageTypeId: 7200,
          type: 502,
          buildingid:common.getBuildingId(deviceId),
          addrid: common.getAddrId(deviceId),
          id: paramId,
          driver: device.driver,
          ext: device.ext,
          deviceId: device.deviceId,
          command: Typedef.DriverCommand.EMC_STATUS,
          mode: Typedef.DriverCommand.EMC_SYNC,
          param: {
            mode: Typedef.DriverCommand.EMC_SYNC,
          }
        };

        Message.Collector.send(evt);

        class ReadingAck{
          constructor(key, id){
            this._acked = false;
            this._key = key;
            this._id = id;
          }
          get key() {return this._key;}
          match(data){
            return data.param.id === this._id;
          }
          do(data){
            if(this._acked){
              return;
            }
            this._acked = true;
            Message.Collector.unRegister(this);
            res.send({
              deviceId: 'YTL'+data.param.addrid,
              scale: data.param.lasttotal
            });
          }
          Timing(sec){
            let _this = this;
            setTimeout(()=>{
              if(this._acked){
                return;
              }
              _this._acked = true;
              Message.Collector.unRegister(_this);
              res.send(502, ErrorCode.ack(ErrorCode.DEVICETIMEOUT));
            }, 1000 * sec);
          }
        }

        let pluginIns = new ReadingAck(req.user.userId+deviceId, paramId);
        Message.Collector.register(pluginIns);
        pluginIns.Timing(5);
      },
      err=>{
        log.error(err, body);
        res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
      }
    );
  }
};
