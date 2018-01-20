'use strict';

const fp = require('lodash/fp');
const omitNulls = require('../services/v1.0/common').omitNulls;
const omitSingleNulls = require('../services/v1.0/common').omitSingleNulls;

const clearUpFields = bill => {
	const billItems = omitNulls(bill.billItems);
	return fp.defaults(omitSingleNulls(bill))({billItems});
};

module.exports = {
	clearUpFields
};
