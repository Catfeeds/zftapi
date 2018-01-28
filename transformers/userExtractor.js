'use strict';

const fp = require('lodash/fp');

module.exports = {
    extract: async (req) => fp.get('user', req.body)
};