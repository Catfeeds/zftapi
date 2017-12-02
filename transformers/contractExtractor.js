'use strict';

const fp = require('lodash/fp');

const extract = (req, user) => fp.defaults(req)({userId: user.id});

module.exports = {
	extract
};