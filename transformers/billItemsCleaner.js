'use strict';

const fp = require('lodash/fp');
const {omitSingleNulls} = require('../services/v1.0/common');

const clearUpFields = bill => {
  const billItems = fp.map(omitSingleNulls)(bill.billItems);
  return fp.defaults(omitSingleNulls(bill))({billItems});
};

module.exports = {
  clearUpFields,
};
