const common = require('../../common')

module.exports = {
  get: (req, res) => {
    const send = res.send.bind(res)
    const sum = MySQL.FundChannelFlows.sum('amount', {
      where: {
        category: Typedef.FundChannelFlowCategory.TOPUP,
      },
      include: [{
        model: MySQL.FundChannels,
        attributes: ['id'],
        where: {
          category: 'online'
        }
      }]
    })

    const withdraw = MySQL.WithDraw.sum('amount', {
      where: {
        status: {$in: [Typedef.WithDrawStatus.DONE]}
      }
    })

    const fee = MySQL.Topup.sum('fee').then(common.translateBalance)

    const frozen = MySQL.WithDraw.sum('amount', {
      where: {
        status: {$in: [Typedef.WithDrawStatus.PENDING, Typedef.WithDrawStatus.PROCESSING]}
      }
    })

    const arrears = MySQL.Exec('select COALESCE(sum(`balance`),0) as value, count(*) as count from cashAccount where `balance` < 0')

    Promise.all([sum, withdraw, fee, arrears, frozen].map(x=>x.then(common.translateBalance)))
      .then(([sum,withdraw,fee,arrears, frozen])=>(
        {sum,withdraw,fee,arrears, frozen, balance: (sum * (1 - 0.006) - frozen - withdraw)}
      ))
      .then(send)
  }
}
