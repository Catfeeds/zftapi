'use strict';
const _ = require('lodash');
const fp = require('lodash/fp');
/**
 * Operations on /houses/format
 */
module.exports = {
    /**
     * summary: get house locations
     * description: pass hid or query parameter to get houese list

     * parameters: key
     * produces: application/json
     * responses: 200, 400
     */
    get: (req, res, next)=>{
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        const param = req.query;
        if(!Util.ParameterCheck(param,
                ['city', 'q']
            )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        const query = {
            keywords: param.q,
            city: param.city
        };
        Amap.InputTips(query).then(
            data=>{
                res.send( fp.map(location=>{

                    if(!location.id || !location.id.length){
                        return;
                    }

                    const position = location.location.split(',');
                    return {
                        name: location.name,
                        district: location.district,
                        address: location.address,
                        divisionId: location.adcode,
                        code: location.id,
                        longitude: position[0],
                        latitude: position[1],
                    };
                })(data) );
            },
            err=>{
                log.error(err, query);
                res.send(500, ErrorCode.ack(ErrorCode.UNKNOWN));
            }
        );
    }
};
