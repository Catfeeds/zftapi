'use strict';
/**
 * Operations on /contracts/{contractid}/bills
 */

const fp = require('lodash/fp');
const removeNullValues = require('../../../../../../../transformers/billItemsCleaner').clearUpFields;

const translate = bills => fp.map(bill => removeNullValues(bill.dataValues))(bills);

module.exports = {
	get: function getContractBills(req, res) {
		const Bills = MySQL.Bills;
		const BillFlows = MySQL.BillFlows;

		Bills.findAll({
			include: [{model: BillFlows,
				as: 'billItems' ,
				attributes: ['configId', 'relevantId', 'amount', 'createdAt', 'id']}],
			where: {
				entityType: 'property',
				contractId: req.params.contractId,
				projectId: req.params.projectId
			}
		}).then(translate)
			.then(bills => res.send(bills))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	}
};
