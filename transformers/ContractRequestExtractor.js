'use strict';

const _ = require('lodash');

const extractUser = req => ({
	name: 'Abraham',
	accountName: _.get(req, 'user.accountName'),
	mobile: '12345678911',
	documentId: '12345678911',
	documentType: 1,
	gender: 'M'
});

const extractContract = (req, user) => ({
	homeId: 23,
	userId: user.id,
	from: 1000,
	to: 2000,
	strategy: 'strategy',
	expenses: 'expenses',
	paymentPlan: 'F03',
	signUpTime: 3000
});


module.exports = {
	extractUser, extractContract
}