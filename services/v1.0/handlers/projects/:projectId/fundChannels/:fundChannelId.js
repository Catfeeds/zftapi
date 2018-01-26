'use strict';
const fp = require('lodash/fp');
const _ = require('lodash');
const common = Include("/services/v1.0/common");
const assignNewId = common.assignNewId;
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
    patch: (req, res)=>{
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        (async()=>{
            const projectId = req.params.projectId;
            const fundChannelId = req.params.fundChannelId;

            if(!Util.ParameterCheck(req.body,
                    ['contractId', 'amount', 'userId']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            const body = req.body;
            const contractId = req.body.contractId;
            const amount = req.body.amount;
            const userId = req.body.userId;

            //todo: check if contract is available

            const receiveChannelAttributes = ['fee', 'setting', 'share'];
            const fundChannelAttributes = ['category', 'flow', 'name', 'tag', 'id'];
            const result = await MySQL.ReceiveChannels.findOne({
                where:{
                    fundChannelId: fundChannelId
                },
                attributes: receiveChannelAttributes,
                include:[
                    {
                        model: MySQL.FundChannels,
                        as: 'fundChannel',
                        where:{
                            status: Typedef.FundChannelStatus.PASSED,
                            projectId: projectId
                        },
                        attributes: fundChannelAttributes,
                        include:[
                            {
                                model: MySQL.ServiceCharge,
                                as: 'serviceCharge'
                            }
                        ]
                    }
                ]
            });

            if(!result){
                return res.send(404, ErrorCode.ack(ErrorCode.CHANNELNOTEXISTS))
            }

            const fundChannel = _.omit( _.assign(result.toJSON(), _.pick(result.fundChannel, _.concat(fundChannelAttributes, 'serviceCharge'))), 'fundChannel' );
            if(fundChannel.category === Typedef.FundChannelCategory.ONLINE){
                if(!fundChannel.setting || !fundChannel.setting.appid || !fundChannel.setting.key){
                    return res.send(501, ErrorCode.ack(ErrorCode.CHANNELPARAMLACK))
                }

                const orderNo = assignNewId().id;
                try {
                    const result = await Util.charge(fundChannel, amount, orderNo, 'subject', 'body', {
                        fundChannelId: fundChannel.id,
                        contractId: contractId,
                        orderNo: orderNo,
                        projectId: projectId,
                        userId: userId,
                    });

                    res.send({
                        pingpp: result
                    })
                }
                catch(e){
                    log.error(e, body);
                }
            }
            else{
                //offline channel
                const result = await common.topUp(fundChannel, projectId, userId, req.user.id, contractId, amount);
                res.send( result );
            }
        })();
    },
    get: (req, res)=> {
        (async()=>{
            //
        })();
    }
};
