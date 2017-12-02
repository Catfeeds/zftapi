'use strict';

const extract = require('../../transformers/contractExtractor').extract;

describe('Extract contract', () => {
	it('should extract contract info from request', () => {
		let user = {id: 999};
		let req = {
			roomId: 23,
			from: 1000,
			to: 2000,
			strategy: '{"name": "strategy"}',
			expenses: '{"name": "expenses"}',
			paymentPlan: 'F03',
			signUpTime: 3000
		};

		extract(req, user).should.be.eql({
			userId: user.id,
			roomId: 23,
			from: 1000,
			to: 2000,
			strategy: '{"name": "strategy"}',
			expenses: '{"name": "expenses"}',
			paymentPlan: 'F03',
			signUpTime: 3000
		});
	});
});