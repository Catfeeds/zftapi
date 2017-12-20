'use strict';
const moment = require('moment');
const _ = require('lodash');
const fp = require('lodash/fp');
const generate = require('../../transformers/billGenerator').generateForContract;
const removeNullValues = require('../../transformers/billGenerator').removeNullValues;

describe('Bill generator', () => {
	it('should omit null fields', () => {
		removeNullValues({id: 1, dead: null, survive: 1, billItems: []})
			.should.eql({id: 1, survive: 1, billItems: []});
	});

	it('should omit null fields even in billItems array', () => {
		const origin = {dead: null, survive: 1, keepMe: 0};
		const after = {survive: 1, keepMe: 0};
		removeNullValues({billItems: [{dataValues: origin}, {dataValues: origin}]})
			.should.eql({billItems: [after, after]});
	});

	it('should omit null fields only', () => {
		removeNullValues({no: null, yes1: 1, yes2: 0, yes3: undefined, yes4: [], yes5: {}})
			.should.eql({billItems: [], yes1: 1, yes2: 0, yes3: undefined, yes4: [], yes5: {}});
	});
	describe('generateForContract', function () {
		it('should generate bills base on contract', () => {
			const startDate = moment().unix();
			const oneYearLater = moment().add(1, 'year').unix();
			const bills = generate({
				strategy: {
					freq: {
						rent: 3600,
						pattern: '1'
					}
				},
				expenses: [
					{
						configId: 111,
						rent: 2600,
						pattern: "paidOff"
					}
				],
				"from": startDate,
				"to": oneYearLater,
				"paymentPlan": "-00",
				projectId: 1,
				contractId: 2,

			});
			bills.should.have.lengthOf(13);
		});

		it('should generate standard bills', () => {
			const startDate = moment().unix();
			const oneYearLater = moment().add(1, 'year').unix();
			const bills = generate({
				strategy: {
					freq: {
						rent: 3600,
						pattern: '12'
					}
				},
				expenses: [],
				"from": startDate,
				"to": oneYearLater,
				"paymentPlan": "-00",
				projectId: 1,
				id: 2,

			});
			_.omit(bills[0], 'createdAt').should.be.eql({
				flow: 'receive',
				entityType: 'property',
				projectId: 1,
				contractId: 2,
				source: 'contract',
				type: 'rent',
				startDate: startDate,
				endDate: oneYearLater,
				dueDate: startDate,
				dueAmount: 3600,
				metadata: {}
			});
		});

		it('should generate one time paid off bills', () => {
			const startDate = moment().unix();
			const oneYearLater = moment().add(1, 'year').unix();
			const bills = generate({
				strategy: {
					freq: {
						rent: 3600,
						pattern: '12'
					}
				},
				expenses: [{
					configId: 112,
					rent: 45000,
					pattern: 'paidOff'
				}],
				"from": startDate,
				"to": oneYearLater,
				"paymentPlan": "-00",
				projectId: 1,
				id: 2,

			});
			const paidOffBill = fp.filter(b => b.type === 'extra')(bills);
			_.omit(paidOffBill[0], 'createdAt').should.be.eql({
				flow: 'receive',
				entityType: 'property',
				projectId: 1,
				contractId: 2,
				source: 'contract',
				type: 'extra',
				startDate: startDate,
				endDate: oneYearLater,
				dueDate: startDate,
				dueAmount: 45000,
				metadata: {}
			});
		});
		it('should generate regular bills', () => {
			const startDate = moment().unix();
			const oneYearLater = moment().add(1, 'year').unix();
			const oneMonthLater = moment().add(1, 'month').unix();
			const bills = generate({
				strategy: {
					freq: {
						rent: 3600,
						pattern: '12'
					}
				},
				expenses: [{
					configId: 112,
					rent: 12000,
					pattern: '1'
				}],
				"from": startDate,
				"to": oneYearLater,
				"paymentPlan": "-00",
				projectId: 1,
				id: 2,

			});
			console.log('bills', bills);
			const regularBill = fp.filter(b => b.type === 'extra')(bills);
			regularBill.should.have.length(12);
			_.omit(regularBill[0], 'createdAt').should.be.eql({
				flow: 'receive',
				entityType: 'property',
				projectId: 1,
				contractId: 2,
				source: 'contract',
				type: 'extra',
				startDate: startDate,
				endDate: oneMonthLater,
				dueDate: startDate,
				dueAmount: 12000,
				metadata: {}
			});
		});
	});
});