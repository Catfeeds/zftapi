'use strict';
const moment = require('moment');
const dueDateShifter = require('../../transformers/dueDateShifter').dueDateShifter;

describe('DueDateShifter', () => {
	it('should not modify the first due date always', () => {
		const startDate = moment().unix();
		const oneYearLater = moment().add(1, 'year').unix();
		const pattern = '1';
		const paymentPlan = '-03';
		dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan, startDate)
			.should.eql(startDate);
	});

	it('should apply the paymentPlan since the second bill cycles', () => {
		const startDate = moment('2017-12-11').unix();
		const oneYearLater = moment('2018-12-10').unix();
		const secondMonth = moment('2018-01-11').unix();
		const expectBillDate = moment('2018-01-08').unix();
		const pattern = '1';
		const paymentPlan = '-03';
		dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan, secondMonth)
			.should.eql(expectBillDate);
	});

	it('should give date base on paymentPlan pattern', () => {
		const startDate = moment('2017-12-11').unix();
		const oneYearLater = moment('2018-12-10').unix();
		const secondMonth = moment('2018-01-11').unix();
		const expectBillDate = moment('2018-01-07').unix();
		const pattern = '1';
		const paymentPlan = '-04';
		dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan, secondMonth)
			.should.eql(expectBillDate);
	});
});