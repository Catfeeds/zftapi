'use strict'
/**
 * Operations on /balance/withdraw
 */
// const fp = require('lodash/fp');
// const moment = require('moment');
// const common = Include('/services/v1.0/common');

module.exports = {
  put: async function(req, res) {
    //get project's balance
    (async()=>{
      const projectId = req.params.projectId

      const body = req.body

      if(!Util.ParameterCheck(body, ['balance', 'fundChannelId'])){
        return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED))
      }
      const fundChannelId = body.fundChannelId

      const fundChannelExits = await MySQL.FundChannels.count({
        where:{
          projectId: projectId,
          id: fundChannelId,
          flow: Typedef.FundFlow.PAY,
          status: Typedef.FundChannelStatus.PASSED
        }
      })
      if(!fundChannelExits){
        return res.send(404, ErrorCode.ack(ErrorCode.CHANNELNOTEXISTS))
      }

      const getWithDraw = Include('/services/v1.0/handlers/projects/:projectId/balance')
      try{
        const result = await getWithDraw.getBalance(projectId)
        if(result.code !== ErrorCode.OK){
          return res.send(403, result)
        }

        const balance = result.result
        const requestForWithdraw = body.balance
        if(requestForWithdraw > balance.balance){
          res.send(404, ErrorCode.ack(ErrorCode.CASHNOTENOUGH))
        }

        //
        const withDraw = {
          projectId: projectId,
          fundChannelId: fundChannelId,
          amount: requestForWithdraw,
          operator: req.user.id,
        }
        await MySQL.WithDraw.create(withDraw)

        res.send(202)
      }
      catch(e){
        log.error(e, projectId)
        re.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC))
      }
    })()
  },
}
