'use strict';
const fp = require('lodash/fp');
const common = Include("/services/v1.0/common");
const _ = require('lodash');
const moment = require('moment');
/**
 * Operations on /fundChannels/{fundChannelId}
 */


module.exports = {
    /**
     * summary: topup
     * description:

     * parameters: hid
     * produces: application/json
     * responses: 200, 400
     */
    patch: (req, res, next)=>{
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        const projectId = req.params.projectId;
        const fundChannelId = req.params.fundChannelId;

        const amount = req.query.amount;

        MySQL.FundChannels.count({
            where:{
                id: fundChannelId
            }
        }).then(
            isExists=>{
                if(!isExists){
                    return res.send(404, ErrorCode.ack(ErrorCode.CHANNELNOTEXISTS))
                }
            }
        );
    }
};
