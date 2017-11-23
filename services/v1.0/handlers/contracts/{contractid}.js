'use strict';
/**
 * Operations on /contracts/{contractid}
 */
module.exports = {
    /**
     * summary: get contract
     * description: pass contractid to get contract info

     * parameters: contractid
     * produces: application/json
     * responses: 200, 400
     */
    get: function getContract(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    },
    /**
     * summary: delete contract
     * description: delete contract

     * parameters: contractid
     * produces: application/json
     * responses: 200, 400
     */
    delete: function (req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    },
    /**
     * summary: reset the contract
     * description: reset the whole contract

     * parameters: contractid, body
     * produces: application/json
     * responses: 200, 400, 401, 406
     */
    post: function resetContract(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    },
    /**
     * summary: operate the contract
     * description: pass contractid to operate contract,dependent on operation field

     * parameters: contractid, operation, body
     * produces: application/json
     * responses: 200, 400
     */
    put: function operateContract(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    }
};
