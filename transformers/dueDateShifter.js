const shiftByPlan = (from, to, paymentPlan) => from;
const dueDateShifter = leaseStartDate => (from, to, paymentPlan) => leaseStartDate === from ? leaseStartDate : shiftByPlan(from, to, paymentPlan);

module.exports = {
	dueDateShifter
}