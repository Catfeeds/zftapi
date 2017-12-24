'use strict';
const fp = require('lodash/fp');
const _ = require('lodash');
const moment = require('moment');
const billCycles = require('./billScheduler').billCycles;

const shiftByPlan = (cycle, benchmark, paymentPlan) => {
	const patternBackShift = /^(-)(\d{2})$/;
	if(patternBackShift.test(paymentPlan)) {
		const matched = patternBackShift.exec(paymentPlan);
		return moment.unix(benchmark).subtract(matched[2], 'days').unix()
	}
	return benchmark;
};

const currentCycle = (timestamp) => (cycle) => moment.unix(timestamp).isBetween(moment.unix(cycle.start), moment.unix(cycle.end), null, '[]')

const dueDateShifter = (leaseStart, leaseEnd) => (pattern, paymentPlan, from) => {
	const restCycles = _.drop(billCycles(leaseStart, leaseEnd, pattern));
	const firstCycle = fp.find(currentCycle(from))(restCycles);
	return _.isUndefined(firstCycle) ? from : shiftByPlan(firstCycle, from, paymentPlan);
};

module.exports = {
	dueDateShifter
};