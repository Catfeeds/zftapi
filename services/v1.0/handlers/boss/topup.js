module.exports = {
  get: (req, res) => {
    const send = res.send.bind(res)
    /*eslint-disable */
    MySQL.Exec(
      `select t.amount, t.fee, t.balance, f.name, u.name, t.orderNo, t.createdAt, b.remark from billpayment b, topup t, users u, auth a , fundChannels f where t.operator = a.id and u.id = t.userId and f.id = t.fundChannelId from order by t.createdAt desc`)
      .then(send)
    /*eslint-disable */
  }
}
