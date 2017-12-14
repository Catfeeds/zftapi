'use strict';
/**
 * Operations on /contracts/:contractId
 */
const fp = require('lodash/fp');

module.exports = {
    /**
     * summary: get contract
     * description: pass contractid to get contract info

     * path variables: contractId
     * produces: application/json
     * responses: 200, 400
     */
    get: function getContract(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */

        const Contracts = MySQL.Contracts;
	    Contracts.findById(req.params.contractId)
		    .then(contract => {
			    if (fp.isEmpty(contract)) {
				    res.send(404);
				    return;
			    }
			    res.send(contract);
		    });
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
