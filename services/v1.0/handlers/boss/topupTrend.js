module.exports = {
  get: (req, res) => {
    const send = res.send.bind(res)
    MySQL.Exec(
      'select count(f.projectId) as value, p.name, f.projectId from billpayment as b, flows as f, projects as p where b.`flowId`=f.id and b.`projectId` = p.id group by f.projectId order by value desc')
      .then(send)
  }
}
