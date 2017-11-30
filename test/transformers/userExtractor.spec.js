'use strict';

const extract = require('../../transformers/userExtractor').extract;

describe('extractUser', function () {
	it('should extract user from request', function () {
		let user = {id: 999, accountName: 'name'};
		let req = {user};
		extract(req).should.be.eql({
			name: 'Abraham',
			accountName: user.accountName,
			mobile: '12345678911',
			documentId: '12345678911',
			documentType: 1,
			gender: 'M'
		});
	});
});