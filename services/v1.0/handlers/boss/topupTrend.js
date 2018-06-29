module.exports = {
  get: (req, res) => {
    const send = res.send.bind(res)
    /*eslint-disable */
    MySQL.Exec(
      `select DATE_FORMAT(f.createdAt, "%Y-%m-%d %H:00") as time, sum(f.amount) as value from flows f where f.category = 'topup' group by DATE_FORMAT(f.createdAt, "%Y-%m-%d %H:00")`)
      .then(send)
    /*eslint-disable */
  }
}
