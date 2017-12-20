'use strict';
const moment = require('moment');
const _ = require('lodash');
const fp = require('lodash/fp');

const dueAt = (startDate, paymentPlan) => startDate;

const expensesReduce = (expenses) => _.sumBy(_.filter(expenses, e => e.pattern === 'withRent'), 'rent');

const dueAmountOf = (strategy, expenses) => strategy.freq.rent + expensesReduce(expenses);

const expenseAmount = (expense) => _.get(expense, 'rent');

const billScheduler = (from, to, freq) => {
	const monthDiff = Math.ceil(moment.duration(moment.unix(to).diff(moment.unix((from)))).asMonths())
	const pace = _.parseInt(freq.pattern);
	return _.range(0, monthDiff, pace)
};

const generateForContract = contract => {
	const from = contract.from;
	const to = contract.to;
	const paymentPlan = contract.paymentPlan;
	const strategy = contract.strategy;
	const expenses = contract.expenses;
	const paidOffBills = (expenses, from, to) =>
		fp.map(expense => paidOffBill(expense, from, to))
		(fp.filter(e => _.includes(['paidOff'], e.pattern))(expenses));
	const regularBills = (expenses, from, to) => _.flatten(
		fp.map(expense => recursiveBill(expense, from, to))
			(fp.filter(e => _.includes(['1', '2', '3', '6', '12'], e.pattern))(expenses)));

	const paidOffBill = (expense, from, to) => ({
		flow: 'receive',
		entityType: 'property',
		projectId: contract.projectId,
		contractId: contract.id,
		source: 'contract',
		type: 'extra',
		startDate: from,
		endDate: to,
		dueDate: dueAt(from, paymentPlan),
		createdAt: moment().unix(),
		dueAmount: expenseAmount(expense),
		metadata: {}
	});

	const recursiveBill = (expense, from, to) => {
		console.log(expense, from, to);
		return billScheduler(from, to, expense.pattern).map(m =>
			regularBill(expense, moment.unix(from).add(m, 'month').unix(),
				moment.unix(from).add(m + _.parseInt(expense.pattern), 'month').unix()));
	}

	const regularBill = (expense, from, to) => ({
		flow: 'receive',
		entityType: 'property',
		projectId: contract.projectId,
		contractId: contract.id,
		source: 'contract',
		type: 'extra',
		startDate: from,
		endDate: to,
		dueDate: dueAt(from, paymentPlan),
		createdAt: moment().unix(),
		dueAmount: expenseAmount(expense),
		metadata: {}
	});
	const standardBill = (freq, from, to) => ({
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
	return _.concat(billScheduler(from, to, strategy.freq).map(m =>
			standardBill(strategy.freq, moment.unix(from).add(m, 'month').unix(),
				moment.unix(from).add(m + _.parseInt(strategy.freq.pattern), 'month').unix())),
		paidOffBills(expenses, from, to), regularBills(expenses, from, to));
};


const extractBillItems = (contract, bill) => [{
	billId: bill.id,
	projectId: contract.projectId,
	configId: 123,
	amount: 10000,
	createdAt: moment().unix()
}, {
	billId: bill.id,
	projectId: contract.projectId,
	configId: 124,
	amount: 11000,
	createdAt: moment().unix()
}, {
	billId: bill.id,
	projectId: contract.projectId,
	configId: 125,
	amount: 12000,
	createdAt: moment().unix()
}, {
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