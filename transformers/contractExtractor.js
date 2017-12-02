'use strict';

const extract = (req, user) => ({
	roomId: 23,
	userId: user.id,
	from: 1000,
	to: 2000,
	strategy: 'strategy',
	expenses: 'expenses',
	paymentPlan: 'F03',
	signUpTime: 3000
});

module.exports = {
	extract
};