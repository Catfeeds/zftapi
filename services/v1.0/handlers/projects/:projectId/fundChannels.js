'use strict'
/**
 * Operations on /fundChannels
 */
const fp = require('lodash/fp')

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
    const projectId = req.params.projectId
    const query = req.query

    if(!Util.ParameterCheck(query,
      ['flow']
    )){
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED))
    }

    const category = query.category
    const status = query.status
    if(category && !fp.includes(query.category)(Typedef.FundChannelCategory)){
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, 'category'))
    }
    if(status && !Typedef.FundChannelStatus[status]){
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, 'status'))
    }

    const where = fp.extendAll([
      {
        projectId: projectId,
        flow: query.flow,
      }
      , query.category ? {category: query.category}: {}
      , status ? {status: status}:{}
    ])

    MySQL.FundChannels.findAll({
      where: where,
      attributes: ['id', 'tag', 'name', 'status']
    }).then(
      channels=>{
        res.send(channels)
      },
      err=>{
        log.error(err, projectId, query)
        res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC))
      }
    )
  },
  post: (req, res)=>{
    const projectId = req.params.projectId
    const body = req.body

    if(!Util.ParameterCheck(body,['flow', 'tag', 'name', 'account'])){
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED))
    }

    const fundChannel = {
      flow: body.flow,
      projectId: projectId,
      category: Typedef.FundChannelCategory.ONLINE,
      tag: body.tag,
      name: body.name
    }

    MySQL.Sequelize.transaction(t=>{
      return MySQL.FundChannels.create(fundChannel, {transaction: t}).then(
        result=>{
          const payChannel = {
            fundChannelId: result.id,
            account: body.account,
            subbranch: body.subbranch,
            locate: body.locate,
            linkman: body.linkman,
          }
          if(body.flow === Typedef.FundFlow.PAY){
            return MySQL.PayChannels.create(payChannel, {transaction: t})
          }
          else if(body.flow === Typedef.FundFlow.RECEIVE){
            return MySQL.PayChannels.create(payChannel, {transaction: t})
          }
        }
      )
    }).then(
      ()=>{
        res.send(204)
      }
    ).catch(
      err=>{
        log.error(err, projectId, body)
        res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC))
      }
    )
  }
}
