'use strict';
/**
 * Operations on /fundChannels
 */
const fp = require('lodash/fp');

module.exports = {
    /**
     * summary: search available fundChannels
     * description: user get all available fundChannels to topup

     * parameters: userId
     * produces: application/json
     * responses: 200, 400
     */
    get: (req, res)=>{
        /**
         *
         */
        const projectId = req.params.projectId;
        const query = req.query;

        if(!Util.ParameterCheck(query,
            ['flow', 'category']
        )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        if(!fp.includes(query.category)(Typedef.FundChannelCategory)){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, 'category'));
        }

        const where = fp.assignIn({
            projectId: projectId,
            flow: query.flow,
        })(
            query.category === Typedef.FundChannelCategory.ALL ?
                {} :
                {category: query.category});

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
};
