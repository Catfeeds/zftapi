'use strict';

const generate = require('../../transformers/billGenerator').generate;

describe('Bill generator', function () {
	it('should generate bill base on contract', function () {
		generate({id: 1}).should.have.lengthOf(1);
	});
});