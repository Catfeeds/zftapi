'use strict';
const moment = require('moment');
const fp = require('lodash/fp');

const {billPace, billCycles} = require('./billScheduler');
const {dueDateShifter, onDisplayShift} = require('./dueDateShifter');
const {assignNewId} = require('../services/v1.0/common');

const expensesReduce = expenses => fp.sumBy('rent', fp.filter(e => e.pattern === 'withRent')(expenses));

const dueAmountOf = (strategy, expenses) => strategy.freq.rent + expensesReduce(expenses);

const expenseAmount = (expense, from, to) => fp.getOr(0)('rent')(expense) * billPace(expense.pattern, from, to);

const bondOf = contract => fp.compact([fp.get('strategy.bond')(contract)]);

const generate = contract => {
  const from = contract.from;
  const to = contract.to;
  const paymentPlan = contract.paymentPlan;
  const strategy = contract.strategy;
  const expenses = contract.expenses;
  const dueAt = dueDateShifter(from, to);
  const userId = contract.userId;

  const paidOffBills = (expenses, from, to) => fp.map(expense => paidOffBill(expense, from, to))(
    fp.filter(e => fp.includes(e.pattern)(['paidOff']))(expenses)
  );
  const regularBills = (expenses, from, to) => fp.flatten(
    fp.map(expense => recursiveBills(expense, from, to, regularBill))(
      fp.filter(e => fp.includes(e.pattern)(['1', '2', '3', '6', '12']))(expenses)
    )
  );

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
    metadata: expense,
    userId
  });
  const map = fp.map.convert({cap: false});
  const recursiveBills = (expense, from, to, singleBill) => map((m, index) =>
    singleBill(expense, m.start, m.end, index + 1))(billCycles(from, to, expense.pattern));

  const regularBill = (expense, from, to, index) => ({
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
    metadata: expense,
    index,
    userId,
  });
  const standardBill = (freq, from, to, index) => {
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
      },
      index,
      userId,
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
    metadata: {bond: amount},
    userId,
  });

  return fp.reduce(fp.concat)([])([
    onDisplayShift(recursiveBills(strategy.freq, from, to, standardBill)),
    paidOffBills(expenses, from, to),
    onDisplayShift(regularBills(expenses, from, to)),
    bondOf(contract).map(amount => bondBill(amount, from, to))
  ]);
};

const finalBill = (settlement) => {
  const now = moment().unix();
  return assignNewId({
    flow: fp.getOr('pay')('flow')(settlement),
    entityType: 'property',
    projectId: settlement.projectId,
    contractId: settlement.contractId,
    userId: settlement.userId,
    source: 'contract',
    type: 'final',
    startDate: now,
    endDate: now,
    dueDate: now,
    createdAt: now,
    dueAmount: fp.getOr(0)('amount')(settlement),
    remark: fp.getOr('')('remark')(settlement),
    metadata: settlement
  });
};

module.exports = {
  generate,
  finalBill
};