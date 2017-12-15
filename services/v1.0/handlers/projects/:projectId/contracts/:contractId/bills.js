'use strict';
/**
 * Operations on /contracts/{contractid}/bills
 */
const _ = require('lodash');
const fp = require('lodash/fp');
const moment = require('moment');

const translate = bills => fp.map(
	bill => fp.defaults({house: {houseId: 999}, paymentHistory: [
		{amount: 40000, paymentChannel: 'alipay',
			operator: 332, createdAt: moment().unix(), status: 'pending'},
		{amount: 2000, paymentChannel: 'wechat',
			operator: 331, createdAt: moment().unix(), status: 'pending'}
	]})(_.pickBy(bill.dataValues))
)(bills);

module.exports = {
	get: function getContractBills(req, res) {
		const Bills = MySQL.Bills;
		const BillFlows = MySQL.BillFlows;

		Bills.findAll({
			include: [{model: BillFlows,
				as: 'billItems' ,
				attributes: ['configId', 'relevantId', 'amount', 'createdAt']}],
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
