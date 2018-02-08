'use strict';
const moment = require('moment');
const fp = require('lodash/fp');
const assignFieldId = require('../services/v1.0/common').assignFieldId;
const assignNewId = require('../services/v1.0/common').assignNewId;

const finalPayment = (settlement) => assignNewId(assignFieldId('orderNo')({
    bills: settlement.bills,
    projectId: settlement.projectId,
    operator: settlement.operatorId,
    amount: fp.getOr(0)('amount')(settlement),
    fundChannel: {id: fp.get('fundChannelId')(settlement)},
    paidAt: moment().unix(),
    status: 'approved'
}));
module.exports = {
    finalPayment
};