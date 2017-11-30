'use strict';

const extract = require('../../transformers/userExtractor').extract;

describe('extractUser', function () {
	it('should extract user from request', function () {
		const user = {
			name: 'Abraham',
			accountName: 'accountName',
			mobile: '12345678911',
			documentId: '12345678911',
			documentType: 1,
			gender: 'M'
		};
		const req = {body: {user}};
		extract(req).should.be.eql(user);
	});
});