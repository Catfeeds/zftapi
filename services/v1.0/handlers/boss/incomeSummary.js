const common = require('../../common')
module.exports = {
  get: (req, res) => {
    const send = res.send.bind(res)
    const sum = MySQL.FundChannelFlows.sum('amount', {
      where: {
        category: Typedef.FundChannelFlowCategory.TOPUP,
      }
    }).then(common.translateBalance)

    const withdraw = MySQL.WithDraw.sum('amount', {
      where: {
        status: {$in: [Typedef.WithDrawStatus.DONE]}
      }
    }).then(common.translateBalance)

    const fee = MySQL.Topup.sum('fee').then(common.translateBalance)

    const arrears = MySQL.Exec('select COALESCE(sum(`balance`),0) as value, count(*) as count from cashAccount where `balance` < 0')

    Promise.all([sum, withdraw, fee, arrears]).then(([sum,withdraw,fee,arrears])=>({sum,withdraw,fee,arrears}))
      .then(send)
  }
}
