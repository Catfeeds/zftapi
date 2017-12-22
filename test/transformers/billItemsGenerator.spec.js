'use strict';
const moment = require('moment');
const _ = require('lodash');

const generate = require('../../transformers/billItemsGenerator').generate;

describe('Bill items generator', () => {
	it('should generate bond billItems', () => {
		const startDate = moment().unix();
		const oneYearLater = moment().add(1, 'year').unix();
		const contract = {
			strategy: {
				freq: {
					rent: 100,
					pattern: 'paidOff'
				},
				bond: 100
			},
			expenses: [],
			from: startDate,
			to: oneYearLater,
			paymentPlan: "-00",
			projectId: 1,
			id: 2,
		};

		const bill = {
			id: 999,
			flow: 'receive',
			entityType: 'property',
			projectId: 1,
			contractId: 2,
			source: 'contract',
			type: 'bond',
			startDate: startDate,
			endDate: oneYearLater,
			dueDate: startDate,
			dueAmount: 100,
			metadata: {
				bond: 100
			}
		};
		_.omit(generate(contract, bill)[0], 'createdAt').should.be.eql({
			"amount": 100,
			"billId": 999,
			"configId": 123,
			"projectId": 1
		});
	});
	it('should generate standard billItems with extra expense', () => {
		const startDate = moment().unix();
		const oneYearLater = moment().add(1, 'year').unix();
		const contract = {
			strategy: {
				freq: {
					rent: 100,
					pattern: '1'
				}
			},
			expenses: [{
				configId: 112,
				rent: 200,
				pattern: 'withRent'
			}],
			from: startDate,
			to: oneYearLater,
			paymentPlan: "-00",
			projectId: 1,
			id: 2,
		};

		const bill = {
			id: 999,
			flow: 'receive',
			entityType: 'property',
			projectId: 1,
			contractId: 2,
			source: 'contract',
			type: 'rent',
			startDate: startDate,
			endDate: oneYearLater,
			dueDate: startDate,
			dueAmount: 300,
			metadata: {
				freq: {
					rent: 100,
					pattern: '1'
				},
				expenses: [{
					configId: 112,
					rent: 200,
					pattern: 'withRent'
				}],
				months: 1
			}
		};
		const billItems = generate(contract, bill);
		const items = _.partition(billItems, i => i.configId === 121);
		const standardBill = items[0];
		const withRentExpense = items[1];
		_.omit(standardBill[0], 'createdAt').should.be.eql({
			"amount": 100,
			"billId": 999,
			"configId": 121,
			"projectId": 1
		});
		_.omit(withRentExpense[0], 'createdAt').should.be.eql({
			"amount": 200,
			"billId": 999,
			"configId": 112,
			"projectId": 1
		});
	});

	it('should generate other billItems as normal expense', () => {
		const startDate = moment().unix();
		const oneYearLater = moment().add(1, 'year').unix();
		const contract = {
			strategy: {
				freq: {
					rent: 100,
					pattern: '1'
				}
			},
			expenses: [{
				configId: 311,
				rent: 200,
				pattern: '1'
			}],
			from: startDate,
			to: oneYearLater,
			paymentPlan: "-00",
			projectId: 1,
			id: 2,
		};

		const bill = {
			id: 999,
			flow: 'receive',
			entityType: 'property',
			projectId: 1,
			contractId: 2,
			source: 'contract',
			type: 'extra',
			startDate: startDate,
			endDate: oneYearLater,
			dueDate: startDate,
			dueAmount: 200,
			metadata: {
				configId: 311,
				rent: 200,
				pattern: '1'
			}
		};
		const billItems = generate(contract, bill);
		_.omit(billItems[0], 'createdAt').should.be.eql({
			"amount": 200,
			"billId": 999,
			"configId": 311,
			"projectId": 1
		});
	});
});