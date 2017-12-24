'use strict';

const fp = require('lodash/fp');

module.exports = {
	extract: async (req, user) => await fp.defaults({userId: user.id, projectId: req.params.projectId})(req.body)
};