'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');

module.exports = {
    /**
	 * summary: search houses
	 * description: pass hid or query parameter to get house list

	 * parameters: hfmt, community, searchkey, status, division, rooms, floors, housetype, offset, limit
	 * produces: application/json
	 * responses: 200, 400
	 */
    get: (req, res)=>{
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

            const pagingInfo = Util.PagingInfo(query.index, query.size, true);

            const deviceIds = fp.map(device=>{
                return device.deviceId;
            })(await MySQL.HouseDevices.findAll({
                where:{
                    projectId: projectId,
                    endDate: 0
                },
                distinct: 'deviceId',
                attributes: ['deviceId']
            }));

            //
            const deviceQuery = fp.assignIn({
                deviceId: {$notIn: deviceIds},
            })(query.q ? {
                $or: [
                    {name: new RegExp(query.q)},
                    {type: new RegExp(query.q)},
                    {tag: new RegExp(query.q)},
                ],
            } : {});

            try {
                const result = await MySQL.Devices.findAndCountAll({
                    where: deviceQuery,
                    attributes: ['deviceId', 'name'],
                    offset: pagingInfo.skip,
                    limit: pagingInfo.size
                });

                res.send(
                    {
                        paging: {
                            count: result.count,
                            index: pagingInfo.index,
                            size: pagingInfo.size
                        },
                        data: fp.map(device => {
                            return {
                                deviceId: device.deviceId,
                                title: device.name,
                            };
                        })(result.rows)
                    }
                );
            }
            catch(err){
                log.error(err, projectId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }

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
