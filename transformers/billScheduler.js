'use strict';
const _ = require('lodash');
const moment = require('moment');

const billPace = (pattern, from, to) => isNaN(pattern) ? monthDiff(from, to) : _.parseInt(pattern);

const monthDiff = (from, to) => Math.ceil(moment.duration(moment.unix(to).diff(moment.unix((from)))).asMonths());

const billCycles = (from, to, pattern) => {
	const diff = monthDiff(from, to);
	return _.range(0, diff, billPace(pattern, from, to))
};


module.exports = {
	billCycles,
	billPace
}