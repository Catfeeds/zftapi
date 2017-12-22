'use strict';
const _ = require('lodash');
const moment = require('moment');

const generate = (contract, bill) => {
	const standardBill = _.compact([_.get(bill, 'metadata.freq')]);
	const paidWithBill = _.get(bill, 'metadata.expenses', []);
	const otherBill = _.compact([_.get(bill, 'metadata.configId')]);
	const bondBill = _.compact([_.get(bill, 'metadata.bond')]);

	return _.concat(standardBill.map(pattern => ({
			billId: bill.id,
			projectId: contract.projectId,
			configId: 121, // 常规租金
			amount: pattern.rent * bill.metadata.months,
			createdAt: moment().unix()
		})),
		paidWithBill.map(pattern => ({
			billId: bill.id,
			projectId: contract.projectId,
			configId: pattern.configId,
			amount: pattern.rent * bill.metadata.months,
			createdAt: moment().unix()
		})),
		otherBill.map(configId => ({
			billId: bill.id,
			projectId: contract.projectId,
			configId,
			amount: bill.dueAmount,
			createdAt: moment().unix()
		})),
		bondBill.map(pattern => ({
			billId: bill.id,
			projectId: contract.projectId,
			configId: 123, //常规押金
			amount: bill.dueAmount,
			createdAt: moment().unix()
		})));
};

module.exports = {
	generate
};