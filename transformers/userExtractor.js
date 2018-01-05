'use strict';

const _ = require('lodash');

module.exports = {
	extract: async (req) => _.get(req.body, 'user')
}