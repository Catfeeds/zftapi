'use strict';
const fp = require('lodash/fp');
const {manualNotification} = require('../../../pushService');
const {allowToSendNotification} = require('../../../../../auth/access');

module.exports = {
  post: async (req, res) => {
    if (!allowToSendNotification(req)) {
      return res.send(403, ErrorCode.ack(ErrorCode.PERMISSIONDENIED,
        {error: 'Only admin can send notifications to other users.'}));
    }
    const balance = await MySQL.CashAccount.findAll({
      where: {
        userId: {
          $in: req.body.users
        },
        balance: {
          $lt: 0
        }
      },
    });
    console.log(
      `Manual urging ids: ${fp.map(fp.get('dataValues.userId'))(balance)}`);
    fp.each(b => {
      const cashAccount = b.toJSON();
      manualNotification(MySQL)(cashAccount);
    })(balance);

    res.send(ErrorCode.ack(ErrorCode.OK));
  }
};