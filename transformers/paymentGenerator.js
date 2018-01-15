'use strict';
const moment = require('moment');
const _ = require('lodash');

const finalPayment = (settlement) => {
	const now = moment().unix();
	return {
		billId: settlement.billId,
		projectId: settlement.projectId,
		amount: _.get(settlement, 'amount', 0),
		paymentChannel: _.get(settlement, 'paymentChannel', 'cash'),
		operator: settlement.operatorId,
		createdAt: now,
		status: 'approved'
	};
}
module.exports = {
	finalPayment
}