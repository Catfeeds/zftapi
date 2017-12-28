'use strict';
/**
 * Operations on /contracts/{contractid}/bills
 */
const _ = require('lodash');
const fp = require('lodash/fp');
const moment = require('moment');
const removeNullValues = require('../../../../../../../transformers/billItemsCleaner').clearUpFields;

const translate = bills => fp.map(
	bill => fp.defaults({house: {houseId: 999}, paymentHistory: [
		{amount: 10000, paymentChannel: 'alipay',
			operator: 332, createdAt: moment().subtract(5, 'days').unix(), status: 'pending'},
		{amount: 30000, paymentChannel: 'alipay',
			operator: 332, createdAt: moment().subtract(9, 'days'), status: 'approved'},
		{amount: 2000, paymentChannel: 'wechat',
			operator: 331, createdAt: moment().subtract(7, 'days'), status: 'pending'},
		{amount: 40000, paymentChannel: 'cash',
			operator: 331, createdAt: moment().subtract(10, 'days'), status: 'declined'}
	]})(removeNullValues(bill.dataValues))
)(bills);

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
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, err)));
	}
};
