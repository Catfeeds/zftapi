'use strict';
/**
 * Operations on /communities/:communityId
 */
module.exports = {
	get: function getCommunity(req, res, next) {
		//TODO: implement this ASAP
		const proxy = require('../../../proxy/proxy');
		proxy.delegate(req.route.path, res, next);
	}
};
