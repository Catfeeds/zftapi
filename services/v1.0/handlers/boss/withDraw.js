module.exports = {
  get: async (req, res) => {
    const fn = MySQL.Sequelize.fn
    let withDraw = await MySQL.WithDraw.findAll({
      // attributes: [
      //   [fn('sum', MySQL.Sequelize.col('channel->project->fundChannelFlows.amount')), 'sum'],
      // ],
      order:[['createdAt', 'DESC']],
      include:[{
        model: MySQL.FundChannels,
        as: 'channel',
        include:[{
          model:MySQL.Projects,
          as: 'project',
          // include:[{
          //   model: MySQL.FundChannelFlows,
          //   as: 'fundChannelFlows'
          // }]
        }]
      }]
    })
    res.send({withDraw})
  }
}
