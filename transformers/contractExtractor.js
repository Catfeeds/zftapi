'use strict';

const fp = require('lodash/fp');

module.exports = {
	extract: (req, user) => new Promise(resolve =>
		resolve(
			fp.defaults({userId: user.id, projectId: req.params.projectId})(req.body)
		)
	)
};