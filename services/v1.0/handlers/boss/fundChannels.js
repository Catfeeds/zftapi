// const sequelize = require('sequelize')
module.exports = {
  get: async (req, res) => {
    const send = res.send.bind(res)
    MySQL.Exec(
      'select count(*) as value, f.name from billpayment as b join fundChannels as f where b.`fundChannelId`=f.id group by f.name')
      .then(send)
  }
}
