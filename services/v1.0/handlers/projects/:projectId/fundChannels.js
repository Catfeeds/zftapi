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
        const projectId = req.params.projectId;
        const query = req.query;

        if(!Util.ParameterCheck(query,
                ['flow', 'tag']
            )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        const where = _.assignIn({
                projectId: projectId,
                flow: query.flow
            },
            _.isArray(query.tag) ? {tag: {$in: query.tag}} : {tag: query.tag}
        );

        MySQL.FundChannels.findAll({
            where: where,
            attributes: ['id', 'tag', 'name']
        }).then(
            channels=>{
                res.send(channels);
            },
            err=>{
                log.error(err, projectId, query);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        );
    }
>>>>>>> feature_prePaidBills
};
