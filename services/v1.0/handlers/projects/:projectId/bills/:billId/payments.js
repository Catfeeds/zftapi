'use strict';

const moment = require('moment');
const _ = require('lodash');
const fp = require('lodash/fp');
const assignNewId = require('../../../../../common').assignNewId;
/**
 * Operations on /bills/{billid}/payments
 */
module.exports = {

  post: async function createPayment(req, res) {
    const BillPayment = MySQL.BillPayment;
    const Bills = MySQL.Bills;
    const projectId = req.params.projectId;
    const billId = req.params.billId;

    const operator = req.isAuthenticated() && req.user.id;
    const now = moment().unix();
    const payment = {
      billId,
      projectId,
      operator,
      amount: _.get(req, 'body.amount', 0),
      paymentChannel: _.get(req, 'body.paymentChannel', 'cash'),
      paidAt: _.get(req, 'body.paidAt', now),
      remark: _.get(req, 'body.remark', ''),
      status: 'pending',
    };

    return Bills.findById(billId, {include: [{model: BillPayment, as: 'payments'}]}).then(bill => {
      if (fp.isEmpty(bill)) {
        return res.send(404);
      }
      return bill;
    }).then(bill => {
      if (bill.dueAmount === payment.amount) {
        return bill;
      }
      throw new Error(`Bill ${billId} has amount ${bill.dueAmount}, which doesn't match payment ${payment.amount}.`)
    }).then(bill => {
      if (_.isEmpty(bill.payments)) {
        return bill;
      }
      throw new Error(`Bill ${billId} already has payment ${_.get(bill, 'payments[0].id')}.`)
    })
      .then(() => BillPayment.create(assignNewId(payment)))
      .then(() => res.send(201, ErrorCode.ack(ErrorCode.OK, {})))
      .catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
  }
};
