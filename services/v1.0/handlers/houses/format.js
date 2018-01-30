'use strict';
const _ = require('underscore');

/**
 * Operations on /houses/format
 */
module.exports = {
    /**
     * summary: get house format
     * description: get houese list

     * parameters: projectid
     * produces: application/json
     * responses: 200, 400
     */
    get: function searchHouseFMT(req, res) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        let ret = [];
        _.map(Typedef.HouseFormatLiteral, (v, k)=>{
            ret.push({
                id: k,
                name: v.name
            });
        });

        res.send(ret);
    }
};
