'use strict';
/**
 * Operations on /environments
 */
const fp = require('lodash/fp');
const _ = require('lodash');
const moment = require('moment');
const common = Include("/services/v1.0/common");

module.exports = {
	/**
	 * summary: return environments belong to project
	 * description: pass projectId to get the environments variables

	 * parameters: projectId
	 * produces: application/json
	 * responses: 200, 400
	 */
	get: (req, res, next)=>{
		/**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
        (async()=>{
            const environments = {
                houseFormat: Typedef.HouseFormatLiteral,
				projectId: 100,
				roomType: Typedef.RoomType,
				operationStatus: Typedef.OperationStatusLiteral,
				orientation: Typedef.OrientationLiteral,
            };
            res.send(environments);
        })();
	},
};
