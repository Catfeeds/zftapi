module.exports = {
  get: async (req, res) => {
    let payChannelQuery = MySQL.PayChannels.findAll({
      include:[{
        model: MySQL.FundChannels,
        as: 'fundChannel',
        include:[{
          model:MySQL.Projects,
          as: 'project'
        }]
      }]
    })
    let withDrawQuery = MySQL.WithDraw.findAll({
      include:[{
        model: MySQL.FundChannels,
        as: 'channel',
        include:[{
          model:MySQL.Projects,
          as: 'project'
        }]
      }]
    })
    let [payChannel, withDraw] = await Promise.all([payChannelQuery, withDrawQuery])
    res.send({payChannel,withDraw})
  }
}
