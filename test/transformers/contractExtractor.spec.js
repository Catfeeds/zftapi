'use strict';

const extract = require('../../transformers/contractExtractor').extract;

describe('Extract contract', () => {
	it('should extract contract info from request', () => {
		let user = {id: 999};
		let req = {
			body: {
				roomId: 23,
				from: 1000,
				to: 2000,
				strategy: '{"name": "strategy"}',
				expenses: '{"name": "expenses"}',
				paymentPlan: 'F03',
				signUpTime: 3000
			},
			params: {
				projectId: 123
			}
		};

		return extract(req, user).should.eventually.eql({
			userId: user.id,
			roomId: 23,
			from: 1000,
			to: 2000,
			strategy: '{"name": "strategy"}',
			expenses: '{"name": "expenses"}',
			paymentPlan: 'F03',
			signUpTime: 3000,
			projectId: 123
		});
	});
});