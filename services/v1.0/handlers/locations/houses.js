'use strict';
const _ = require('lodash');
const validator = require('validator');

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
    get: function searchHouseFMT(req, res, next) {
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
                let returns = [];
                data.map(d=>{
                    d.divisionId = d.adcode;

                    const location = d.location.split(',');
                    d.longitude = location[0];
                    d.latitude = location[1];

                    d = _.omit(d, ['adcode', 'location', 'typecode']);
                    returns.push(d);
                });

                res.send(ErrorCode.ack(ErrorCode.OK, returns));
            },
            err=>{
                log.error(err, query);
                res.send(500, ErrorCode.ack(ErrorCode.UNKNOWN));
            }
        );
    }
};
