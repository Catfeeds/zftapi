module.exports = {
  get: async (req, res) => {
    let withDraw = await MySQL.WithDraw.findAll({
      include:[{
        model: MySQL.FundChannels,
        as: 'channel',
        include:[{
          model:MySQL.Projects,
          as: 'project'
        }]
      }]
    })
    res.send({withDraw})
  }
}
