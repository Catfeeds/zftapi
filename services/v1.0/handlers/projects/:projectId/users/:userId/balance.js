'use strict';
const {assignNewId, moveFundChannelToRoot, topUp} = require('../../../../../common');

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
      const userId = req.params.userId;

      const body = req.body;
      const amount = body.amount;
      const fundChannelId = body.fundChannelId;

      if(!Util.ParameterCheck(body, ['amount', 'fundChannelId'])){
        return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, 'please provide amount & fundChannelId.'));
      }


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
        return res.send(404, ErrorCode.ack(ErrorCode.CHANNELNOTEXISTS));
      }

      const contract = await MySQL.Contracts.findOne({
        where:{
          userId: userId,
          status: Typedef.ContractStatus.ONGOING
        },
        order:[['createdAt', 'ASC']],
        attributes:['id']
      });
      if(!contract){
        return res.send(404, ErrorCode.ack(ErrorCode.CONTRACTNOTEXISTS));
      }
      const contractId = contract.id;

      const fundChannel = moveFundChannelToRoot(result)(fundChannelAttributes);
      if(fundChannel.category === Typedef.FundChannelCategory.ONLINE){
        if(!fundChannel.setting || !fundChannel.setting.appid || !fundChannel.setting.key){
          return res.send(501, ErrorCode.ack(ErrorCode.CHANNELPARAMLACK));
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
            pingpp: result.result
          });
        }
        catch(e){
          log.error(e, body);
        }
      }
      else{
        //offline channel
        const result = await topUp(fundChannel, projectId, userId, req.user.id, contractId, amount);
        if(result.code !== ErrorCode.OK){
          res.send(500, result);
        }
        else {
          res.send(result.result);
        }
      }
    })();
  },
};
