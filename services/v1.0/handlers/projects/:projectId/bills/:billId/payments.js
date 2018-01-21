'use strict';

const fp = require('lodash/fp');
const moment = require('moment');
const assignNewId = require('../../../../../common').assignNewId;
/**
 * Operations on /bills/{billid}/payments
 */
module.exports = {

	post: async function createPayment(req, res) {
		const BillPayment = MySQL.BillPayment;
		const Bills = MySQL.Bills;
		const Flows = MySQL.Flows;
		const projectId = req.params.projectId;
		const billId = req.params.billId;

		const operator = req.isAuthenticated() && req.user.id;
		const now = moment().unix();
		const payment = {
			billId,
			projectId,
			operator,
			amount: fp.getOr(0)('body.amount')(req),
			paymentChannel: fp.getOr('cash')('body.paymentChannel')(req),
			paidAt: fp.getOr(now)('body.paidAt')(req),
			remark: fp.getOr('')('body.remark')(req),
			status: 'pending',
		};
		const Sequelize = MySQL.Sequelize;

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
			if (fp.isEmpty(bill.payments)) {
				return bill;
			}
			throw new Error(`Bill ${billId} already has payment ${fp.get('payments[0].id')(bill)}.`);
		})
			.then(() => Sequelize.transaction(t =>
				Flows.create(assignNewId({projectId}), {transaction: t})
					.then(flow =>
						BillPayment.create(fp.defaults({flowId: flow.id})(assignNewId(payment)), {transaction: t}))
			)).then(results => res.send(201, ErrorCode.ack(ErrorCode.OK, results)))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	}
};
