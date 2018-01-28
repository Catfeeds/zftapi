'use strict';
const moment = require('moment');
const fp = require('lodash/fp');
const assignFieldId = require('../services/v1.0/common').assignFieldId;
const assignNewId = require('../services/v1.0/common').assignNewId;

const finalPayment = (settlement) => assignNewId(assignFieldId('orderNo')({
    billId: settlement.billId,
    flowId: settlement.flowId,
    projectId: settlement.projectId,
    amount: fp.getOr(0)('amount')(settlement),
    fundChannelId: fp.get('fundChannelId')(settlement),
    operator: settlement.operatorId,
    paidAt: moment().unix(),
    status: 'approved'
}));
module.exports = {
    finalPayment
};