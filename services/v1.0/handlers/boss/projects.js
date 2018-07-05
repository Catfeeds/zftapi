module.exports = {
  get: async (req, res) => {
    let result = await MySQL.Houses.findAll({
      attributes: [
        [MySQL.Sequelize.fn('sum', MySQL.Sequelize.col('devices.deviceId')), 'deviceCount'],
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
        attributes: [
          [MySQL.Sequelize.fn('count', MySQL.Sequelize.col('rooms.id')), 'count'],
        ],
        include: [
        {
          model: MySQL.Contracts,
          as: 'contracts'
      }]
      },],
      group: 'houses.projectId'
    })
    res.send(result)
  }
}
