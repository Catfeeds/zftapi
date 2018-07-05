module.exports = {
  get: async (req, res) => {
    let result = await MySQL.Houses.findAll({
      attributes: [
        [MySQL.Sequelize.fn('count', MySQL.Sequelize.col('devices.id')), 'deviceCount'],
        [MySQL.Sequelize.fn('count', MySQL.Sequelize.col('rooms.id')), 'roomCount'],
        [MySQL.Sequelize.fn('count', MySQL.Sequelize.col('rooms->contracts.userId')), 'userCount'],

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
        }]
      },],
      group: 'houses.projectId'
    })
    res.send(result)
  }
}
