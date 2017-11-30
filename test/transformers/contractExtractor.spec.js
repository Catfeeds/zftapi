'use strict';

const extract = require('../../transformers/contractExtractor').extract;

describe('Extract contract', function () {
	it('should extract contract info from request', function () {
		let user = {id: 999};
		let req = {user};
		extract(req, user).should.be.eql({
			homeId: 23,
			userId: user.id,
			from: 1000,
			to: 2000,
			strategy: 'strategy',
			expenses: 'expenses',
			paymentPlan: 'F03',
			signUpTime: 3000
		});
	});
});