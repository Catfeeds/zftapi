'use strict';
/**
 * Operations on /bills
 */
module.exports = {
    /**
     * summary: create bill info
     * description: save contract information

     * parameters: body
     * produces: application/json
     * responses: 200, 400
     */
    post: function createBills(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    },
    /**
     * summary: search bills
     * description: pass hid or query parameter to get houese list

     * parameters: hfmt, status, entity, flow, type
     * produces: application/json
     * responses: 200, 400
     */
    get: function getBills(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    }
};
