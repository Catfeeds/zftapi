module.exports = {
  get: (req, res) => {
    const send = res.send.bind(res)
    /*eslint-disable */
    MySQL.Exec(
      "select sum(f.amount) as value, p.name, f.projectId from flows as f, projects as p where f.category = 'topup' and f.direction='receive' and f.`projectId` = p.id and f.`createdAt` between DATE_FORMAT(NOW() ,'%Y-01-01') and NOW() group by f.projectId order by value desc limit 10")
      .then(send)
    /*eslint-disable */
  }
}
