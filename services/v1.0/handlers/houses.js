'use strict';
/**
 * Operations on /houses
 */
module.exports = {
    /**
     * summary: search houses
     * description: pass hid or query parameter to get houese list

     * parameters: hfmt, community, searchkey, status, division, rooms, floors, housetype, offset, limit
     * produces: application/json
     * responses: 200, 400
     */
    get: function getHouse(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    },
    /**
     * summary: save house
     * description: save house information

     * parameters: body
     * produces: application/json
     * responses: 200, 400
     */
    post: function saveHouse(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        let body = req.body;
        // if(!Util.ParameterCheck(body, ['hFmt', 'projectId', 'location', 'community', 'roomNumber', 'area', 'tFloor'])){
        //     return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        // }

        if(!Typedef.isHouseFormat(body.hFmt)){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERERROR, {'hFmt': body.hFmt}));
        }



        res.send(body);
    }
};
