'use strict';
const _ = require('lodash');
const moment = require('moment');

const billPace = (pattern, from, to) => isNaN(pattern) ? monthDiff(from, to) : _.parseInt(pattern);

const monthDiff = (from, to) => Math.ceil(moment.duration(moment.unix(to).diff(moment.unix((from)))).asMonths());
const plusMonth = (from, m) => moment.unix(from).add(m, 'month').unix();

const billCycles = (from, to, pattern) => {
	return billScheduler(from, to, pattern)
		.map(cycle => ({
			start: plusMonth(from, cycle),
			end: plusMonth(from, cycle + billPace(pattern, from, to))
		}))
};

const billScheduler = (from, to, pattern) => {
	const diff = monthDiff(from, to);
	return _.range(0, diff, billPace(pattern, from, to))
};


module.exports = {
	billCycles,
	billPace
}