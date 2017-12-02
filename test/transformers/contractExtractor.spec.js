'use strict';

const fp = require('lodash/fp');
const extract = require('../../transformers/contractExtractor').extract;

describe('Extract contract', function () {
	it('should extract contract info from request', function () {
		let user = {id: 999};
		let req = {
			roomId: 23,
			from: 1000,
			to: 2000,
			strategy: 'strategy',
			expenses: 'expenses',
			paymentPlan: 'F03',
			signUpTime: 3000
		};

		let expectation = fp.defaults(req)({userId: user.id});

		extract(req, user).should.be.eql(expectation);
	});
});