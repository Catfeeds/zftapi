'use strict';

const fp = require('lodash/fp');
const {omitNulls, omitSingleNulls} = require('../services/v1.0/common');

const clearUpFields = bill => {
    const billItems = omitNulls(bill.billItems);
    return fp.defaults(omitSingleNulls(bill))({billItems});
};

module.exports = {
    clearUpFields,
};
