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
    get: (req, res, next)=>{
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        (async()=>{
            const params = req.params;
            const query = req.query;

            if(!Util.ParameterCheck(query,
                    ['houseFormat', 'q']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            const projectId = params.projectId;
            const houseFormat = query.houseFormat;
            const q = query.q;

            let sql = `select h.id as houseId, loc.name, s.group, s.building, s.unit, s.roomNumber from ${MySQL.Houses.name} as h 
                     inner join ${MySQL.GeoLocation.name} as loc on h.geoLocation = loc.id 
                     inner join ${MySQL.Soles.name} as s on s.houseId = h.id
                      where houseFormat=:houseFormat and (roomNumber regexp :q or loc.name regexp :q) `;
            const result = await MySQL.Exec(sql, query);

            res.send(result || []);

        })();
    }
};
