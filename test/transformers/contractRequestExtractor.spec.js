'use strict';

const extractContract = require('../../transformers/contractRequestExtractor').extractContract;
const extractUser = require('../../transformers/contractRequestExtractor').extractUser;

describe('Extract contract request', function () {
	describe('extractContract', function () {
		it('should extract contract info from request', function () {
			let user = {id: 999};
			let req = {user};
			extractContract(req, user).should.be.eql({
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
	})

	describe('extractUser', function () {
		it('should extract user from request', function () {
			let user = {id: 999, accountName: 'name'};
			let req = {user};
			extractUser(req).should.be.eql({
				name: 'Abraham',
				accountName: user.accountName,
				mobile: '12345678911',
				documentId: '12345678911',
				documentType: 1,
				gender: 'M'
			});
		});
	})
});