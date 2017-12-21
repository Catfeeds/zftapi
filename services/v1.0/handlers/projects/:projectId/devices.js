'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
const _ = require('lodash');
const moment = require('moment');
const common = Include("/services/v1.0/common");

module.exports = {
	/**
	 * summary: search houses
	 * description: pass hid or query parameter to get house list

	 * parameters: hfmt, community, searchkey, status, division, rooms, floors, housetype, offset, limit
	 * produces: application/json
	 * responses: 200, 400
	 */
	get: (req, res, next)=>{
		/**
		 * mode=FREE
		 */
        (async()=>{
            const projectId = req.params.projectId;
            const query = req.query;

            if(!Util.ParameterCheck(query,
                    ['mode']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }
            const mode = query.mode;
            if(mode !== 'FREE'){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERERROR));
            }

            const project = await MySQL.Projects.findOne({
                where:{
                    pid: projectId
                },
                attributes: ['externalId']
            });
            if(!project){
                return res.send(404, ErrorCode.ack(ErrorCode.PROJECTNOTEXISTS));
            }
            const externalId = project.externalId;

            const deviceIds = fp.map(device=>{
                return device.deviceId;
            })(await MySQL.HouseDevices.findAll({
                where:{
                    projectId: projectId,
                    endDate: 0
                },
                attributes: ['deviceId']
            }));

            //
            MongoDB.SensorAttribute
                .find({
                    project: externalId,
                    _id:{$nin: deviceIds}
                })
                .select('_id title')
                .then(
                    devices=>{
                        res.send(
                            fp.map(device=>{
                                return {
                                    deviceId: device._id,
                                    title: device.title,
                                }
                            })(devices)
                        );
                    },
                    err=>{
                        log.error(err, projectId);
                        res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
                    }
                );
        })();

        // if(!Typedef.IsHouseFormat(houseFormat)){
        //     return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERERROR, 'houseFormat'));
        // }
        //
        //
        // const housesQuery = ()=> {
        //     switch (houseFormat) {
        //         case Typedef.HouseFormat.ENTIRE:
        //             return common.QueryEntire(projectId, query,
        //                 [
        //                     {
        //                         model: MySQL.HouseDevices,
        //                         as: 'Devices'
        //                     },
        //                 ]
        //             );
        //             break;
        //         default:
        //             break;
        //     }
        // };
        // housesQuery().then(
        //     data=>{
        //         res.send(data)
        //     },
        //     err=>{
        //         log.error(err, projectId, query);
        //         res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        //     }
        // );
	}
};
