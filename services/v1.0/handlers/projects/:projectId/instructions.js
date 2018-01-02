'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
const _ = require('lodash');
const moment = require('moment');

module.exports = {
    /**
     * summary: search houses
     * description: pass hid or query parameter to get house list

     * parameters: hfmt, community, searchkey, status, division, rooms, floors, housetype, offset, limit
     * produces: application/json
     * responses: 200, 400
     */
    post: (req, res, next)=>{
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


        MySQL.HouseDevices.findAll({
            where:{
                projectId: projectId,
                sourceId: roomId,
                endDate: 0
            },
            attributes: ['deviceId']
        }).then(
            devices=>{
                const deviceIds = fp.map(dev=>{return dev.deviceId;})(devices);
                MongoDB.SensorAttribute
                    .find({
                        _id:{$in: deviceIds}
                    })
                    .select('_id driver ext addrid')
                    .then(
                        attributes=>{

                            const evt = {
                                timestamp: moment().unix(),
                                type: 7200,
                                commands: fp.map(attrib=>{
                                    let deviceId = GUID.DeviceID(attrib._id);
                                    deviceId.addrid = attrib.addrid;

                                    return {
                                        id: SnowFlake.next(),
                                        driver: attrib.driver,
                                        ext: attrib.ext,
                                        gatewayid: deviceId.gatewayid,
                                        buildingid: deviceId.buildingid,
                                        meterid: deviceId.meterid,
                                        addrid: deviceId.addrid,
                                        command: 'EMC_SWITCH',
                                        mode: mode
                                    };
                                })(attributes)
                            };

                            Message.Collector.send(evt);
                        }
                    );
            },
            err=>{
                log.error(err, roomId, mode);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        );
    }
};
