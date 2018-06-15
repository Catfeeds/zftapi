'use strict'
/**
 * Operations on /balance
 */
// const fp = require('lodash/fp');
const common = Include('/services/v1.0/common')

async function getBalance(projectId){
  try {

    const sumOfProject = common.translateBalance(await MySQL.FundChannelFlows.sum('amount', {
      where: {
        category: Typedef.FundChannelFlowCategory.TOPUP,
        projectId: projectId
      }
    }))

    const frozenOfProject = common.translateBalance(await MySQL.WithDraw.sum('amount', {
      where: {
        projectId: projectId,
        status: {$in: [Typedef.WithDrawStatus.PENDING, Typedef.WithDrawStatus.PROCESSING]}
      }
    }))

    const withdrawOfProject = common.translateBalance(await MySQL.WithDraw.sum('amount', {
      where: {
        projectId: projectId,
        status: {$in: [Typedef.WithDrawStatus.DONE]}
      }
    }))

    return ErrorCode.ack(ErrorCode.OK, {
      balance: sumOfProject - frozenOfProject - withdrawOfProject,
      frozen: frozenOfProject
    })
  }
  catch(e){
    log.error(e, projectId)
    return ErrorCode.ack(ErrorCode.DATABASEEXEC)
  }
}

module.exports = {
  getBalance: getBalance,
  get: async function(req, res) {
    //get project's balance
    (async()=>{
      const projectId = req.params.projectId

      try {
        const result = await getBalance(projectId)

        if(result.code === ErrorCode.OK){
          res.send(result.result)
        }
        else{
          res.send(403, result)
        }
      }
      catch(e){
        log.error(e, projectId)
        re.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC))
      }
    })()
  },
}
