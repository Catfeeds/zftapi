'use strict';

const _ = require('lodash');

module.exports = {
	extract : req => _.get(req.body, 'user')
}