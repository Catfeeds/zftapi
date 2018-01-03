'use strict';
/**
 * Operations on /fundChannels
 */
const fp = require('lodash/fp');
const _ = require('lodash');
const moment = require('moment');

module.exports = {
	/**
	 * summary: search available fundChannels
	 * description: user get all available fundChannels to topup

	 * parameters: userId
	 * produces: application/json
	 * responses: 200, 400
	 */
	get: (req, res, next)=>{
		/**
		 *
		 */
        (async()=>{
            const projectId = req.params.projectId;
            const query = req.query;

            if(!Util.ParameterCheck(query,
                    ['userId']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            //

        })();
	}
};
