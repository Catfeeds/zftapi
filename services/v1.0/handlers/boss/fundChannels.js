module.exports = {
  get: (req, res) => {
    const send = res.send.bind(res)
    let template = (timespan) => `select count(f.name) as value, f.name from topup as t, fundChannels as f where t.fundChannelId=f.id and ${timespan} group by f.name`

    let today = MySQL.Exec(template('t.`createdAt` >= CURRENT_DATE()'))
    /*eslint-disable */
    let thisMonth = MySQL.Exec(template("t.`createdAt` between DATE_FORMAT(NOW() ,'%Y-%m-01') and NOW()"))

    let thisYear = MySQL.Exec(template("t.`createdAt` between DATE_FORMAT(NOW() ,'%Y-01-01') and NOW()"))
    /*eslint-disable */

    Promise.all([today, thisMonth, thisYear])
      .then(([today,month,year])=>({today,month,year}))
      .then(send)
  }
}
