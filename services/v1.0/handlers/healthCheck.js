'use strict';
/**
 * Operations on /healthCheck
 */
module.exports = {
  get: async (req, res) => MySQL.Sequelize
    .query(
      'SELECT 1 FROM houses limit 1',
      {raw: true, plain: false}
    )
    .then(state => {
      res.send(200, ErrorCode.ack(ErrorCode.OK, state));
    })
};
