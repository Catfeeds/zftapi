const chai = require('chai');
const should = chai.should();
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

describe('first test', function () {
	it('should allow promise testing', function () {
		return Promise.resolve(1).should.eventually.equal(1);
	});
});