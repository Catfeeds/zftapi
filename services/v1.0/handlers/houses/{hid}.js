'use strict';
/**
 * Operations on /houses/{hid}
 */
module.exports = {
    /**
     * summary: get specified houses by hid
     * description: pass hid or query parameter to get houese list

     * parameters: hid
     * produces: application/json
     * responses: 200, 400
     */
    get: function getHouseByHID(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    },
    /**
     * summary: delete house
     * description: save house information

     * parameters: hid
     * produces: application/json
     * responses: 200, 400, 405, 410
     */
    delete: function deleteHouse(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    },
    /**
     * summary: update house
     * description: save house information

     * parameters: hid, body
     * produces: application/json
     * responses: 200, 400
     */
    put: function updateHouse(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    }
};
