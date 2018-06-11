'use strict';
const fp = require('lodash/fp');
const common = Include('/services/v1.0/common');

module.exports = {
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
