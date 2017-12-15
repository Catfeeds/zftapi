'use strict';
/**
 * Operations on /contracts/{contractid}/bills
 */
const _ = require('lodash');
const fp = require('lodash/fp');

const translate = bills => fp.map(
	bill => fp.defaults({house: {houseId: 999}})(_.pickBy(bill.dataValues))
)(bills);

module.exports = {
	get: function getContractBills(req, res) {
		const Bills = MySQL.Bills;
		Bills.findAll({
			where: {
				entityType: 'property',
				contractId: req.params.contractId,
				projectId: req.params.projectId
			}
		}).then(translate)
			.then(bills => res.send(bills))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, err)));
	}
};
