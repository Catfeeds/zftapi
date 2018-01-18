'use strict';
const moment = require('moment');
const _ = require('lodash');
const fp = require('lodash/fp');
const generate = require('../../transformers/billGenerator').generate;


describe('Bill generator', () => {
	it('should generate bills base on contract', () => {
		const startDate = moment().unix();
		const oneYearLater = moment().add(1, 'year').unix();
		const bills = generate({
			strategy: {
				freq: {
					rent: 3600,
					pattern: '1'
				},
				bond: 0
			},
			expenses: [
				{
					configId: 111,
					rent: 2600,
					pattern: 'paidOff'
				}
			],
			from: startDate,
			to: oneYearLater,
			paymentPlan: '-00',
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
				},
				bond: 0
			},
			expenses: [],
			from: startDate,
			to: oneYearLater,
			paymentPlan: '-00',
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
			dueAmount: 3600 * 12,
			metadata: {
				freq: {
					rent: 3600,
					pattern: '12'
				},
				expenses: [],
				months: 12
			},
			index: 1
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
				},
				bond: 0
			},
			expenses: [{
				configId: 112,
				rent: 1000,
				pattern: 'paidOff'
			}],
			from: startDate,
			to: oneYearLater,
			paymentPlan: '-00',
			projectId: 1,
			id: 2
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
			dueAmount: 12000,
			metadata: {
				configId: 112,
				rent: 1000,
				pattern: 'paidOff'
			}
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
			from: startDate,
			to: oneYearLater,
			paymentPlan: '-00',
			projectId: 1,
			id: 2
		});

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
			metadata: {
				configId: 112,
				rent: 12000,
				pattern: '1'
			},
			index: 1
		});
	});

	it('should support paid off pattern in standard bills', () => {
		const startDate = moment().unix();
		const oneYearLater = moment().add(1, 'year').unix();
		const bills = generate({
			strategy: {
				freq: {
					rent: 3600,
					pattern: 'paidOff'
				}
			},
			expenses: [],
			from: startDate,
			to: oneYearLater,
			paymentPlan: '-00',
			projectId: 1,
			id: 2,

		});
		bills.should.have.length(1);
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
			dueAmount: 43200,
			metadata: {
				freq: {
					rent: 3600,
					pattern: 'paidOff'
				},
				expenses: [],
				months: 12
			},
			index: 1
		});
	});

	it('should combine withRent expenses into standard bills', () => {
		const startDate = moment().unix();
		const oneYearLater = moment().add(1, 'year').unix();
		const oneMonthLater = moment().add(1, 'month').unix();
		const bills = generate({
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
			paymentPlan: '-00',
			projectId: 1,
			id: 2
		});
		bills.should.have.length(12);
		_.omit(bills[0], 'createdAt').should.be.eql({
			flow: 'receive',
			entityType: 'property',
			projectId: 1,
			contractId: 2,
			source: 'contract',
			type: 'rent',
			startDate: startDate,
			endDate: oneMonthLater,
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
			},
			index: 1
		});
	});

	it('should turn withRent expenses as the same schedule as standard bills', () => {
		const startDate = moment().unix();
		const oneYearLater = moment().add(1, 'year').unix();
		const bills = generate({
			strategy: {
				freq: {
					rent: 100,
					pattern: 'paidOff'
				}
			},
			expenses: [{
				configId: 112,
				rent: 200,
				pattern: 'withRent'
			}],
			from: startDate,
			to: oneYearLater,
			paymentPlan: '-00',
			projectId: 1,
			id: 2
		});
		bills.should.have.length(1);
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
			metadata: {
				freq: {
					rent: 100,
					pattern: 'paidOff'
				},
				expenses: [{
					configId: 112,
					rent: 200,
					pattern: 'withRent'
				}],
				months: 12
			},
			index: 1
		});
	});

	it('should generate bond bill while bond is greater than 0', () => {
		const startDate = moment().unix();
		const oneYearLater = moment().add(1, 'year').unix();
		const bills = generate({
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
			paymentPlan: '-00',
			projectId: 1,
			id: 2,

		});
		bills.should.have.length(2);
		const bondBill = fp.filter(b => b.type === 'bond')(bills);
		_.omit(bondBill[0], 'createdAt').should.be.eql({
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
		});
	});
});