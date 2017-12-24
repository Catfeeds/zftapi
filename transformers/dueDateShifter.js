const billCycles = require('./billScheduler').billCycles;

const shiftByPlan = (cycle, benchmark, paymentPlan) => benchmark;

const dueDateShifter = (leaseStart, leaseEnd) => (pattern, paymentPlan, from) => {
	const currentCycle = billCycles(leaseStart, leaseEnd, pattern)[0];
	return shiftByPlan(currentCycle, from, paymentPlan);
};

module.exports = {
	dueDateShifter
};