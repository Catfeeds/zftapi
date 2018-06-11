'use strict';
const fp = require('lodash/fp');
const moment = require('moment');

const generate = (contract, bill) => {
  const standardBill = fp.compact([fp.get('metadata.freq')(bill)]);
  const paidWithBill = fp.getOr([])('metadata.expenses')(bill);
  const otherBill = fp.compact([fp.get('metadata.configId')(bill)]);
  const bondBill = fp.compact([fp.get('metadata.bond')(bill)]);

  return fp.reduce(fp.concat)([])([
    standardBill.map(pattern => ({
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
    bondBill.map(() => ({
      billId: bill.id,
      projectId: contract.projectId,
      configId: 123, //常规押金
      amount: bill.dueAmount,
      createdAt: moment().unix()
    }))
  ]);
};

module.exports = {
  generate
};