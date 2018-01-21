'use strict';
const auth = require('../../../auth/auth');

module.exports = {
	post: auth.authenticate
};