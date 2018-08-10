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
      `select t.amount, t.fee, t.balance, f.name as channel, u.name, t.orderNo, t.createdAt, b.remark, b.status
         from topup as t
         left join fundChannelFlows as fl on t.orderNo = fl.orderNo
         left join billpayment as b on b.id = fl.billId
         left join users as u on u.id = t.userId
         left join fundChannels as f on f.id = t.fundChannelid
         where t.createdAt <= :to and t.createdAt >= :from
         group by t.orderNo
         order by t.createdAt desc`, {
         from, to
       })
      .then(send)
    /*eslint-disable */
  }
}
