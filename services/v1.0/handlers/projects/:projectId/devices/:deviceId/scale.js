'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
// const moment = require('moment');
const common = Include('/services/v1.0/common');

module.exports = {
    /**
	 * summary: search houses
	 * description: pass hid or query parameter to get house list

	 * parameters: hfmt, community, searchkey, status, division, rooms, floors, housetype, offset, limit
	 * produces: application/json
	 * responses: 200, 400
	 */
    get: (req, res)=>{
        (async()=>{
            const projectId = req.params.projectId;
            const deviceId = req.params.deviceId;

            if (!Util.ParameterCheck(req.query, ['startDate', 'endDate'])) {
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            const startDate = req.query.startDate;
            const endDate = req.query.endDate;

            MySQL.DeviceData.findAll({
                where:{
                    deviceId: deviceId,
                    time:{$between: [startDate, endDate]}
                },
                attributes:[['rateReading', 'scale'], 'time'],
                order:[['time', 'desc']]
            }).then(
                data=>{
                    res.send(fp.map(d=>{
                        d = d.toJSON();
                        d.scale = common.scaleDown(d.scale);
                        return d;
                    })(data));
                },
                err=>{
                    log.error(err, projectId, deviceId, startDate, endDate);
                    res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
                }
            );
        })();
    }
};
