'use strict';

const _ = require('lodash');

module.exports = {
	extract: req => new Promise((resolve) => resolve(_.get(req.body, 'user')))
}