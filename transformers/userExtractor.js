'use strict';

const _ = require('lodash');

module.exports = {
	extract: async req => await _.get(req.body, 'user')
}