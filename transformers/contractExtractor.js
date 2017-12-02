'use strict';

const fp = require('lodash/fp');

module.exports = {
	extract: (req, user) => new Promise((resolve) => resolve(fp.defaults(req.body)({userId: user.id})))
};