'use strict';
/**
 * Operations on /contracts/:contractId
 */
const fp = require('lodash/fp');
const _ = require('lodash');

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
		const Rooms = MySQL.Rooms;
		const contractId = req.params.contractId;
		const status = _.get(req, 'body.status', 'empty').toUpperCase();
		const roomStatus = _.get(req, 'body.roomStatus', Typedef.OperationStatus.IDLE).toUpperCase();

		if (status !== Typedef.ContractStatus.TERMINATED) {
			return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {status, allowedStatus: [Typedef.ContractStatus.TERMINATED]}));
		}
		const allowedStatus = [Typedef.OperationStatus.IDLE,
			Typedef.OperationStatus.PAUSED];
		if (!_.includes(allowedStatus, roomStatus)) {
			return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {roomStatus, allowedStatus }));
		}

		const Sequelize = MySQL.Sequelize;

		return Contracts.findById(contractId, {include: [{model: Rooms, required: true}]})
			.then(contract => {
				if (fp.isEmpty(contract)) {
					res.send(404);
					return;
				}
				console.log('room', contract.dataValues.room);
				//TODO: record a new flow {billFlow: {dueAmount: 9900, paymentMethod: cash, operator: 312}}

				return Sequelize.transaction(t => {
					return Promise.all([
						contract.update({
							status
						}, {transaction: t}),
						Rooms.update({
								status: roomStatus
							},
							{
								where: {
									id: contract.dataValues.room.id
								},
								transaction: t
							})
					])
				})
			}).then((updated, room) => res.send(updated))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, err)));
    }
};
