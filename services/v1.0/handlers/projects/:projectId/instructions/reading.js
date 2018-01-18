'use strict';
/**
 * Sync the device reading
 */
const fp = require('lodash/fp');
const _ = require('lodash');
const moment = require('moment');

module.exports = {
    patch: (req, res, next)=>{
        /**
         * deviceId=xxx
         */
        const body = req.body;
        if(!Util.ParameterCheck(body, ['deviceId']
            )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        const projectId = req.params.projectId;
        const deviceId = body.deviceId;

        MySQL.Devices.findOne({
            where:{
                deviceId: deviceId
            }
        }).then(
            device=>{
                //
                const paramId = SnowFlake.next();
                const evt = {
                    timestamp: moment().unix(),
                    messageTypeId: 7200,
                    param: [{
                        id: paramId,
                        driver: device.driver,
                        ext: device.ext,
                        deviceId: device.deviceId,
                        command: Typedef.DriverCommand.EMC_STATUS,
                        mode: Typedef.DriverCommand.EMC_SYNC,
                    }]
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
                            deviceId: data.param.deviceId,
                            scale: data.param.scale
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
                        }, 1000 * sec)
                    }
                }

                let pluginIns = new ReadingAck(req.user.userId+deviceId, paramId);
                Message.Collector.register(pluginIns);
                pluginIns.Timing(5);
            },
            err=>{
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        );
    }
};
