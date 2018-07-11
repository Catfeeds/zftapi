const fp = require('lodash/fp')
module.exports = {
  put: async function (req, res) {
    const body = req.body
    let updated = await MySQL.FundChannels.update(fp.pick(['status'], body), {
      where: {
        id: req.param.channelId
      }
    })
    res.send(200, ErrorCode.ack(ErrorCode.OK, {id: updated.id}))
  }
}
