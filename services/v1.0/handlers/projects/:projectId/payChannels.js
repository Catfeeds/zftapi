module.exports = {
  get: async (req, res) => {
    let payChannels = await MySQL.PayChannels.findAll({
      include:[{
        model: MySQL.FundChannels,
        as: 'fundChannel',
        where: {
          projectId: req.params.projectId,
          flow: req.query.flow,
        }
      }]
    })
    res.send(payChannels)
  }
}
