'use strict';
/**
 * Operations devices in room
 */
const fp = require('lodash/fp');
const moment = require('moment');

module.exports = {
    patch: (req, res)=>{
        /**
         * roomId=xx
         * mode=EMC_ON/EMC_OFF
         */
        const body = req.body;
        if(!Util.ParameterCheck(body, ['roomId', 'mode']
        )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        const projectId = req.params.projectId;
        const roomId = body.roomId;
        const mode = body.mode;

        if( !Typedef.DriverCommand[mode] ){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

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
                const evt = {
                    timestamp: moment().unix(),
                    messageTypeId: 7200,
                    param: fp.map(device=>{
                        return {
                            id: SnowFlake.next(),
                            driver: device.device.driver,
                            ext: device.device.ext,
                            deviceId: device.device.deviceId,
                            command: 'EMC_SWITCH',
                            mode: mode
                        };
                    })(devices)
                };

                Message.Collector.send(evt);
                res.send(202);
            },
            err=>{
                log.error(err, roomId, mode);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        );
    }
};
