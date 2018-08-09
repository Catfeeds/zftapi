const fp = require('lodash/fp')
module.exports = {
  get: (req, res) => {
    const send = res.send.bind(res)
    const from = fp.get(['query', 'from'])(req)
    const to = fp.get(['query', 'to'])(req)
    if (!from || !to || to < from) {
      return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
        {error: 'please provide valid from / to timestamp.'}))
    }
    /*eslint-disable */
    MySQL.Exec(
      `select t.amount, t.fee, t.balance, f.name as channel, u.name, t.orderNo, t.createdAt, b.remark
       from billpayment b, topup t, users u, auth a , fundChannels f
       where t.operator = a.id and u.id = t.userId and f.id = t.fundChannelId
         and t.createdAt <= :to and t.createdAt >= :from
       group by t.orderNo
       order by t.createdAt desc`, {
         from, to
       })
      .then(send)
    /*eslint-disable */
  }
}
