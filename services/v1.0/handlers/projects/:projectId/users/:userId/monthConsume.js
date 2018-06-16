'use strict'
const moment = require('moment')

module.exports = {
  get: async (req, res) => {
    const projectId = req.params.projectId
    const userId = req.params.userId

    if (!Util.ParameterCheck(req.query, ['month'])) {
      return res.send(422,
        ErrorCode.ack(ErrorCode.PARAMETERMISSED, 'please provide month'))
    }

    const month = req.query.month
    const startDate = moment(month, 'YYYYMM').startOf('days')
    const endDate = moment(month, 'YYYYMM').add(1, 'month').startOf('days')

    if (!startDate.isValid() || !endDate.isValid()) {
      return res.send(400,
        ErrorCode.ack(ErrorCode.PARAMETERERROR, {month: month}))
    }

    //
    const contract = await  MySQL.Contracts.findOne({
      where: {
        userId,
        status: Typedef.ContractStatus.ONGOING,
      },
      attributes: ['id'],
    })

    if (!contract) {
      return res.send(404, ErrorCode.ack(ErrorCode.CONTRACTNOTEXISTS))
    }

    const options = {
      where: {
        contractId: contract.id,
        paymentDay: {
          $gte: startDate.unix(),
          $lte: endDate.unix(),
        },
      },
    }
    Promise.all([
      MySQL.DevicePrePaid.sum('amount', options)
      , MySQL.DailyPrePaid.sum('amount', options),
    ]).then(
      ([device, daily]) => {
        const consume = (device || 0) + (daily || 0)
        res.send({
          month,
          consume,
        })
      },
    ).catch(err => {
      log.error('month consume error:', err, projectId, userId, month)
      res.send(500, ErrorCode.ack())
    })
  },
}
