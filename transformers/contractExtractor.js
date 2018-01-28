'use strict';

const fp = require('lodash/fp');

module.exports = {
    extract: async (req, user) => fp.defaults(req.body)({userId: user.id, projectId: req.params.projectId})
};