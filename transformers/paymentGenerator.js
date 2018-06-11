'use strict';
const moment = require('moment');
const fp = require('lodash/fp');
const {assignNewId, assignFieldId} = require('../services/v1.0/common');

const finalPayment = (settlement) => assignNewId(assignFieldId('orderNo')({
  bills: settlement.bills,
  projectId: settlement.projectId,
  operator: settlement.operatorId,
  amount: fp.getOr(0)('amount')(settlement),
  fundChannel: settlement.fundChannel,
  paidAt: moment().unix(),
  status: 'approved',
}));
module.exports = {
  finalPayment,
};