module.exports = {
  get: (req, res) => {
    const send = res.send.bind(res)
    /*eslint-disable */
    MySQL.Exec(
      `select f.createdAt, p.name, f.amount from flows f, projects p where f.category = 'topup' and f.direction='receive' and f.projectId = p.id order by f.createdAt desc limit 20`)
      .then(send)
    /*eslint-disable */
  }
}
