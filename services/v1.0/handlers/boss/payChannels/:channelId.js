module.exports = {
  put: async function (req, res) {
    const body = req.body
    let updated = await MySQL.PayChannels.update(body, {
      where: {
        id: req.params.channelId
      }
    })
    res.send(200, ErrorCode.ack(ErrorCode.OK, {id: updated.id}))
  }
}
