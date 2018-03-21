'use strict';
// const fp = require('lodash/fp');
const moment = require('moment');
// const common = Include('/services/v1.0/common');

module.exports = {
    get: (req, res)=>{
        (async()=>{
            const projectId = req.params.projectId;
            const deviceId = req.params.deviceId;

            if (!Util.ParameterCheck(req.query, ['startDate', 'endDate'])) {
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            const startDate = moment.unix(req.query.startDate).subtract(1, 'days').unix();
            const endDate = req.query.endDate;

            MySQL.DeviceData.findAll({
                where:{
                    deviceId: deviceId,
                    time:{$between: [startDate, endDate]}
                },
                attributes:[['rateReading', 'scale'], 'time'],
            }).then(
                data=>{
                    if(data.length<2){
                        res.send([]);
                    }
                    else{
                        const len = data.length;
                        let usage = [];
                        for(let i=len-1; i>0; i--){

                            const today = data[i].toJSON();
                            const yesterday = data[i-1].toJSON();

                            const day = {
                                time: today.time,
                                usage: today.scale-yesterday.scale
                            };

                            usage.push(day);
                        }

                        res.send(usage);
                    }
                },
                err=>{
                    log.error(err, projectId, deviceId, startDate, endDate);
                    res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
                }
            );
        })();
    }
};
