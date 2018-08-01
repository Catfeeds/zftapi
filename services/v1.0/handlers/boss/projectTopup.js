module.exports = {
  get: (req, res) => {
    const send = res.send.bind(res)
    /*eslint-disable */
    MySQL.Exec(
      "select sum(f.amount) as value, p.name, f.projectId from fundChannelFlows as f, fundChannels as fc, projects as p where f.`fundChannelId`=fc.id and fc.flow='receive' and fc.`category`='online' and f.`projectId` = p.id and f.`createdAt` between DATE_FORMAT(NOW() ,'%Y-01-01') and NOW() group by f.projectId order by value desc limit 10")
      .then(send)
    /*eslint-disable */
  }
}
