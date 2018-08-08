const _ = require('lodash/fp')
module.exports = {
  get: (req, res) => {
    const send = res.send.bind(res)
    const from = _.get(['body', 'from'])(req)
    const to = _.get(['body', 'from'])(req)
    if (!from || !to || to < from || from > now ) {
      return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
        {error: 'please provide valid from / to timestamp.'}))
    }
    /*eslint-disable */
    MySQL.Exec(
      `select t.amount, t.fee, t.balance, f.name, u.name, t.orderNo, t.createdAt, b.remark
       from billpayment b, topup t, users u, auth a , fundChannels f
       where t.operator = a.id and u.id = t.userId and f.id = t.fundChannelId
         and t.createdAt <= :to and t.createdAt >= :from
       order by t.createdAt desc`, {
         from, to
       })
      .then(send)
    /*eslint-disable */
  }
}
