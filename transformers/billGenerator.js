'use strict';
const moment = require('moment');
const _ = require('lodash');
const fp = require('lodash/fp');

// TODO: paymentPlan
const dueAt = (startDate, paymentPlan) => startDate;

const expensesReduce = (expenses) => _.sumBy(fp.filter(e => e.pattern === 'withRent')(expenses), 'rent');

const dueAmountOf = (strategy, expenses) => strategy.freq.rent + expensesReduce(expenses);

const expenseAmount = (expense, from, to) => _.get(expense, 'rent') * billPace(expense.pattern, from, to);

const billPace = (pattern, from, to) => isNaN(pattern) ? monthDiff(from, to) : _.parseInt(pattern);

const monthDiff = (from, to) => Math.ceil(moment.duration(moment.unix(to).diff(moment.unix((from)))).asMonths())

const billScheduler = (from, to, pattern) => {
	const diff = monthDiff(from, to);
	return _.range(0, diff, billPace(pattern, from, to))
};
const plusMonth = (from, m) => moment.unix(from).add(m, 'month').unix();
const bondOf = (contract) => _.compact([_.get(contract, 'strategy.bond')]);

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

	//TODO: bond is different
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
		dueAmount: expenseAmount(expense, from, to),
		metadata: expense
	});

	const recursiveBill = (expense, from, to) => {
		return billScheduler(from, to, expense.pattern).map(m =>
			regularBill(expense, plusMonth(from, m),
				plusMonth(from, m + billPace(expense.pattern, from, to))));
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
		dueAmount: expenseAmount(expense, from, to),
		metadata: expense
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
		dueAmount: dueAmountOf(strategy, expenses) * billPace(freq.pattern, from, to),
		metadata: {freq, expenses: fp.filter(e => e.pattern === 'withRent')(expenses)}
	});

	const bondBill = (amount, from, to) => ({
		flow: 'receive',
		entityType: 'property',
		projectId: contract.projectId,
		contractId: contract.id,
		source: 'contract',
		type: 'bond',
		startDate: from,
		endDate: to,
		dueDate: from,
		createdAt: moment().unix(),
		dueAmount: amount,
		metadata: {bond: amount}
	});

	return _.concat(billScheduler(from, to, strategy.freq.pattern).map(m =>
			standardBill(strategy.freq, plusMonth(from, m),
				plusMonth(from, m + billPace(strategy.freq.pattern, from, to)))),
		paidOffBills(expenses, from, to), regularBills(expenses, from, to),
		bondOf(contract).map(amount => bondBill(amount, from, to)));
};

//TODO: billFlow
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