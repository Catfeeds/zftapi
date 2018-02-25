'use strict';
const fp = require('lodash/fp');
const moment = require('moment');
const billCycles = require('./billScheduler').billCycles;

const shiftByPlan = (cycle, benchmark, paymentPlan) => {
    const patternBackShift = /^(-)(\d{2})$/;
    if (patternBackShift.test(paymentPlan)) {
        const matched = patternBackShift.exec(paymentPlan);
        return moment.unix(benchmark).subtract(matched[2], 'days').unix();
    }
    const patternForwardFix = /^(\+)(\d{2})$/;
    if (patternForwardFix.test(paymentPlan)) {
        const matched = patternForwardFix.exec(paymentPlan);
        const dayInMonth = matched[2];
        const candidateMonths = [
            moment(`${moment.unix(benchmark).format('YYYY-MM')}-${dayInMonth}`),
            moment(`${moment.unix(benchmark).add(1, 'month').format('YYYY-MM')}-${dayInMonth}`)];
        const dateInCycle = fp.find(inCycle(cycle))(candidateMonths);
        return fp.isUndefined(dateInCycle) ? benchmark : dateInCycle.unix();
    }

    const patternFixedBeforeBill = /^F(\d{2})$/;
    if (patternFixedBeforeBill.test(paymentPlan)) {
        const matched = patternFixedBeforeBill.exec(paymentPlan);
        const dayInMonth = matched[1];
        const candidateMonths = [
            moment(`${moment.unix(benchmark).format('YYYY-MM')}-${dayInMonth}`),
            moment(`${moment.unix(benchmark).subtract(1, 'month').format('YYYY-MM')}-${dayInMonth}`)
        ];
        const dateInCycle = fp.find(beforeCycle(cycle))(candidateMonths);
        return fp.isUndefined(dateInCycle) ? benchmark : dateInCycle.unix();
    }

    const patternFixedBeforeOneMonth = /^M(\d{2})$/;
    if (patternFixedBeforeOneMonth.test(paymentPlan)) {
        const matched = patternFixedBeforeOneMonth.exec(paymentPlan);
        const dayInMonth = matched[1];
        return moment(`${moment.unix(benchmark).subtract(1, 'month').format('YYYY-MM')}-${dayInMonth}`).unix();
    }
    return benchmark;
};

const givenDateInRange = (date, cycle) => date.isBetween(moment.unix(cycle.start), moment.unix(cycle.end), null, '[)');
const inCycle = fp.curryRight(givenDateInRange);
const inRange = fp.curry(givenDateInRange);
const beforeCycle = (cycle) => (date) => date.isSameOrBefore(moment.unix(cycle.start));

const dueDateShifter = (leaseStart, leaseEnd) => (pattern, paymentPlan, from) => {
    const restCycles = fp.drop(1, billCycles(leaseStart, leaseEnd, pattern));
    const firstCycle = fp.find(inRange(moment.unix(from)))(restCycles);
    return fp.isUndefined(firstCycle) ? from : shiftByPlan(firstCycle, from, paymentPlan);
};

const onDisplayShift = timestamp => moment.unix(timestamp).add(1, 'day').unix();

module.exports = {
    dueDateShifter,
    onDisplayShift
};