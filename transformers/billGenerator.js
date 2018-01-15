'use strict';
const moment = require('moment');
const _ = require('lodash');
const fp = require('lodash/fp');

const scheduler = require('./billScheduler');
const dueDateShifter = require('./dueDateShifter').dueDateShifter;

const expensesReduce = expenses => _.sumBy(fp.filter(e => e.pattern === 'withRent')(expenses), 'rent');

const dueAmountOf = (strategy, expenses) => strategy.freq.rent + expensesReduce(expenses);

const expenseAmount = (expense, from, to) => _.get(expense, 'rent') * billPace(expense.pattern, from, to);

const billPace = scheduler.billPace;
const billCycles = scheduler.billCycles;

const bondOf = contract => _.compact([_.get(contract, 'strategy.bond')]);

const generate = contract => {
	const from = contract.from;
	const to = contract.to;
	const paymentPlan = contract.paymentPlan;
	const strategy = contract.strategy;
	const expenses = contract.expenses;
	const dueAt = dueDateShifter(from, to);

	const paidOffBills = (expenses, from, to) =>
		fp.map(expense => paidOffBill(expense, from, to))
		(fp.filter(e => _.includes(['paidOff'], e.pattern))(expenses));
	const regularBills = (expenses, from, to) => _.flatten(
		fp.map(expense => recursiveBills(expense, from, to, regularBill))
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
		dueDate: from,
		createdAt: moment().unix(),
		dueAmount: expenseAmount(expense, from, to),
		metadata: expense
	});

	const recursiveBills = (expense, from, to, singleBill) => billCycles(from, to, expense.pattern).map(m =>
		singleBill(expense, m.start, m.end));

	const regularBill = (expense, from, to) => ({
		flow: 'receive',
		entityType: 'property',
		projectId: contract.projectId,
		contractId: contract.id,
		source: 'contract',
		type: 'extra',
		startDate: from,
		endDate: to,
		dueDate: dueAt(expense.pattern, paymentPlan, from),
		createdAt: moment().unix(),
		dueAmount: expenseAmount(expense, from, to),
		metadata: expense
	});
	const standardBill = (freq, from, to) => {
		const months = billPace(freq.pattern, from, to);
		return {
			flow: 'receive',
			entityType: 'property',
			projectId: contract.projectId,
			contractId: contract.id,
			source: 'contract',
			type: 'rent',
			startDate: from,
			endDate: to,
			dueDate: dueAt(freq.pattern, paymentPlan, from),
			createdAt: moment().unix(),
			dueAmount: dueAmountOf(strategy, expenses) * months,
			metadata: {
				freq,
				expenses: fp.filter(e => e.pattern === 'withRent')(expenses),
				months
			}
		};
	};

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

	return _.concat(
		recursiveBills(strategy.freq, from, to, standardBill),
		paidOffBills(expenses, from, to),
		regularBills(expenses, from, to),
		bondOf(contract).map(amount => bondBill(amount, from, to))
	);
};

const finalBill = (settlement) => {
	const now = moment().unix();
	return ({
		flow: 'receive',
		entityType: 'property',
		projectId: settlement.projectId,
		contractId: settlement.contractId,
		source: 'contract',
		type: 'final',
		startDate: now,
		endDate: now,
		dueDate: now,
		createdAt: now,
		dueAmount: _.get(settlement, 'amount', 0),
		remark: _.get(settlement, 'remark', ''),
		metadata: settlement
	});
}

module.exports = {
	generate,
	finalBill
};