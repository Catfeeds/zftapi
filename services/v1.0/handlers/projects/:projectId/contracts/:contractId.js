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
    delete: function (req, res) {
		const Contracts = MySQL.Contracts;
		Contracts.findById(req.params.contractId)
			.then(contract => {
				if (fp.isEmpty(contract)) {
					res.send(404);
					return;
				}
				contract.destroy().then(() => {
					res.send(204);
				})

			})
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, err)));
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
    put: function operateContract(req, res) {
		const Contracts = MySQL.Contracts;
		const contractId = req.params.contractId;
		const status = req.body.status;
		Contracts.findById(contractId)
			.then(contract => {
				if (fp.isEmpty(contract)) {
					res.send(404);
					return;
				}
				//TODO: support {status: terminated, rooms: {status: 'open'}, billFlow: {dueAmount: 9900, paymentMethod: cash, operator: 312}}
				return contract.update({
					status
				});
			}).then(updated => res.send(updated))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, err)));
    }
};
