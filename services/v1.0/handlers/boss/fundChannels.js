module.exports = {
  get: (req, res) => {
    const send = res.send.bind(res)
    let template = (timespan) => `select COALESCE(sum(t.amount),0) as value, f.name from fundChannelFlows as t, fundChannels as f where t.fundChannelId=f.id and ${timespan} group by f.name`

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
