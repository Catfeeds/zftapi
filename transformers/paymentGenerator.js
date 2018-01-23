'use strict';
const moment = require('moment');
const fp = require('lodash/fp');

const finalPayment = (settlement) => {
	const now = moment().unix();
	return {
		billId: settlement.billId,
		flowId: settlement.flowId,
		projectId: settlement.projectId,
		amount: fp.getOr(0)('amount')(settlement),
		fundChannelId: fp.get('fundChannelId')(settlement),
		operator: settlement.operatorId,
		createdAt: now,
		status: 'approved'
	};
};
module.exports = {
	finalPayment
};