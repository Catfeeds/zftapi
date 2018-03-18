'use strict';

const fp = require('lodash/fp');
const moment = require('moment');
const {payBills} = require('../../../../../common');
const {fundChannelById} = require('../../../../../models');
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
            amount: fp.getOr(0)('body.amount')(req),
            fundChannelId: fp.get('body.fundChannelId')(req),
            paidAt: fp.getOr(now)('body.paidAt')(req),
            remark: fp.getOr('')('body.remark')(req),
            status: 'pending',
        };

        if (fp.isUndefined(payment.fundChannelId)) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: 'please provide fundChannelId'}));
        }

        return Promise.all([
            Bills.findById(billId,
                {include: [{model: BillPayment, as: 'payments'}]}),
            fundChannelById(MySQL)(
                {projectId, fundChannelId: payment.fundChannelId})]).
            then(([bill, fundChannel]) => {
                if (fp.isEmpty(bill)) {
                    return res.send(404);
                }
                return ({bill, fundChannel});
            }).
            then(({bill, fundChannel}) => {
                if (bill.dueAmount === payment.amount) {
                    return ({bill, fundChannel});
                }
                throw new Error(
                    `Bill ${billId} has amount ${bill.dueAmount}, `
                    + `which doesn't match payment ${payment.amount}.`);
            }).
            then(({bill, fundChannel}) => {
                if (fp.isEmpty(bill.payments)) {
                    return ({bill, fundChannel});
                }
                throw new Error(`Bill ${billId} already has payment ${fp.get(
                    'payments[0].id')(bill)}.`);
            }).
            then(({bill, fundChannel}) => payBills(MySQL)([bill], projectId,
                fundChannel.toJSON().fundChannel, operator)).
            then(
                results => res.send(201, ErrorCode.ack(ErrorCode.OK, results))).
            catch(err => res.send(500,
                ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    },
};
