'use strict';

const generate = require('../../transformers/billGenerator').generateForContract;

describe('Bill generator', () => {
	it('should generate bill base on contract', () => {
		generate({id: 1}).should.have.lengthOf(1);
	});
});