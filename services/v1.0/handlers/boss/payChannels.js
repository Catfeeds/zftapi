module.exports = {
  get: async (req, res) => {
    let payChannel = await MySQL.PayChannels.findAll({
      include:[{
        model: MySQL.FundChannels,
        as: 'fundChannel',
        include:[{
          model:MySQL.Projects,
          as: 'project'
        }]
      }]
    })
    res.send({payChannel})
  }
}
