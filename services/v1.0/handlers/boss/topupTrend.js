module.exports = {
  get: (req, res) => {
    const send = res.send.bind(res)
    /*eslint-disable */
    MySQL.Exec(
      `select DATE_FORMAT(f.createdAt, "%Y-%m-%d %H:00") as time, sum(f.amount) as value from flows f where f.category = 'topup' and f.direction='receive' and f.createdAt between DATE_FORMAT(NOW() ,'%Y-01-01') and NOW() group by DATE_FORMAT(f.createdAt, "%Y-%m-%d %H:00")`)
      .then(send)
    /*eslint-disable */
  }
}
