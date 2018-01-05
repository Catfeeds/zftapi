'use strict';

const extract = require('../../transformers/userExtractor').extract;

describe('extractUser', () => {
	it('should extract user from request', async () => {
		const user = {
			name: 'Abraham',
			accountName: 'accountName',
			mobile: '12345678911',
			documentId: '12345678911',
			documentType: 1,
			gender: 'M'
		};
		const req = {body: {user}};
		await extract(req).then(data => {
				data.should.be.eql(user);
			}
		)
	});
});