'use strict';
const _ = require('lodash');
const fp = require('lodash/fp');

const clearUpFields = bill => {
	const billItems = fp.map(item => _.omitBy(item.dataValues, _.isNull))(bill.billItems);
	return fp.defaults(_.omitBy(bill, _.isNull))({billItems})
};

module.exports = {
	clearUpFields
}
