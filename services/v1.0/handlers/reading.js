'use strict'
/**
 * Operations on /reading
 */
module.exports = {
  post: async (req, res) => {
    const content = JSON.stringify(req.body)
    console.log(`nb reading got: ${content}`);
    return MySQL.NBReading.create({content}).then(state => {
      res.send(200, ErrorCode.ack(ErrorCode.OK, state))
    })

  },
}
