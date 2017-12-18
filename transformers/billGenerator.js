'use strict';
const moment = require('moment');
const _ = require('lodash');
const fp = require('lodash/fp');

const dueAt = (startDate, paymentPlan) => startDate;
const expensesReduce = (expenses) =>  _.sumBy(_.filter(expenses, e => e.pattern === 'withRent'), 'rent');
const dueAmountOf = (strategy, expenses) => strategy.freq.rent + expensesReduce(_.reject(expenses, e => e.configId === 111));
const bondValue = (expenses) => _.find(expenses, e => e.configId === 111).rent;
const oneTimeBills = (expenses, from, to) => _.filter(expenses, e => _.includes(['paidOff'], e.pattern));
const regularBills = (expenses, from, to) => _.filter(expenses, e => _.includes(['1', '2', '3', '6', '12'], e.pattern));
const generateForContract = contract => {
	const from = contract.from;
	const to = contract.to;
	const paymentPlan = contract.paymentPlan;
	const strategy = contract.strategy;
	const expenses = contract.expenses;
	const singleBill = (from, to) => ({
		flow: 'receive',
		entityType: 'property',
		projectId: contract.projectId,
		contractId: contract.id,
		source: 'contract',
		type: 'rent',
		startDate: from,
		endDate: to,
		dueDate: dueAt(from, paymentPlan),
		createdAt: moment().unix(),
		dueAmount: dueAmountOf(strategy, expenses),
		metadata: {}
	});
	const bondBill = (from, to) => ({
		flow: 'receive',
		entityType: 'property',
		projectId: contract.projectId,
		contractId: contract.id,
		source: 'contract',
		type: 'rent',
		startDate: from,
		endDate: to,
		dueDate: dueAt(from, paymentPlan),
		createdAt: moment().unix(),
		dueAmount: bondValue(expenses),
		metadata: {}
	});
	return _.concat([bondBill(from, to)], _.range(0, 12).map(m => singleBill(moment.unix(from).add(m, 'month').unix(), moment.unix(from).add(m + 1, 'month').unix())));
};

const extractBillItems = (contract, bill) => [{
	billId: bill.id,
	projectId: contract.projectId,
	configId: 123,
	amount: 10000,
	createdAt: moment().unix()
},{
	billId: bill.id,
	projectId: contract.projectId,
	configId: 124,
	amount: 11000,
	createdAt: moment().unix()
},{
	billId: bill.id,
	projectId: contract.projectId,
	configId: 125,
	amount: 12000,
	createdAt: moment().unix()
},{
	billId: bill.id,
	projectId: contract.projectId,
	configId: 126,
	amount: 13000,
	createdAt: moment().unix()
}];

const removeNullValues = bill => {
	const billItems = fp.map(item => _.omitBy(item.dataValues, _.isNull))(bill.billItems);
	return fp.defaults(_.omitBy(bill, _.isNull))({billItems})
};

module.exports = {
	generateForContract,
	extractBillItems,
	removeNullValues
}