module.exports = {
  get: async (req, res) => {
    const fn = MySQL.Sequelize.fn
    let result = await MySQL.Houses.findAll({
      attributes: [
        [fn('count', fn('DISTINCT', MySQL.Sequelize.col('devices.id'))), 'deviceCount'],
        [fn('count', fn('DISTINCT', MySQL.Sequelize.col('rooms.id'))), 'roomCount'],
        [fn('count', fn('DISTINCT', MySQL.Sequelize.col('rooms->contracts.id'))), 'activeCount'],
        [fn('count', fn('DISTINCT', MySQL.Sequelize.col('rooms->contracts.userId'))), 'userCount'],
      ],
      include:[{
        model: MySQL.HouseDevices,
        as: 'devices'
      },{
        model:MySQL.Projects,
        as: 'project'
      },{
        model: MySQL.Rooms,
        as: 'rooms',
        include: [
          {
            model: MySQL.Contracts,
            as: 'contracts',
            require: false,
            where:{status: Typedef.ContractStatus.ONGOING}
          }]
      },],
      group: 'houses.projectId'
    })
    res.send(result)
  }
}
