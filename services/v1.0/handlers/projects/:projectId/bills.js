'use strict';
/**
 * Operations on /bills
 */
const _ = require('lodash');
const fp = require('lodash/fp');
const moment = require('moment');
const removeNullValues = require('../../../../../transformers/billGenerator').removeNullValues;

const translate = bills => fp.map(
	bill => fp.defaults({house: {houseId: 999}, paymentHistory: [
		{amount: 10000, paymentChannel: 'alipay',
			operator: 332, createdAt: moment().subtract(5, 'days').unix(), status: 'pending'},
		{amount: 30000, paymentChannel: 'alipay',
			operator: 332, createdAt: moment().subtract(9, 'days'), status: 'approved'},
		{amount: 2000, paymentChannel: 'wechat',
			operator: 331, createdAt: moment().subtract(7, 'days'), status: 'pending'},
		{amount: 40000, paymentChannel: 'cash',
			operator: 331, createdAt: moment().subtract(10, 'days'), status: 'declined'}
	]})(removeNullValues(bill.dataValues))
)(bills);

const duplicate = bills => _.concat(bills, transformToTopUp(bills), transformToDevice(bills))
const transformToTopUp = bills => fp.map(bill => fp.defaults(bill)({source: 'topup', id: bill.id + 10000}))(bills);
const transformToDevice = bills => {
	const singleBill = bill => {
		const billItems = fp.map(item => fp.defaults({relativeId: 321})(item))(bill.billItems);
	    return fp.defaults(bill)({billItems, source: 'device', id: bill.id + 20000});
	};
	return fp.map(singleBill)(bills);
}

module.exports = {
    /**
     * summary: create bill info
     * description: save contract information

     * parameters: body
     * produces: application/json
     * responses: 200, 400
     */
    post: function createBills(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    },
    /**
     * summary: search bills
     * description: pass hid or query parameter to get houese list

     * parameters: hfmt, status, entity, flow, type
     * produces: application/json
     * responses: 200, 400
     */
    get: function getBills(req, res, next) {
		const Bills = MySQL.Bills;
		const BillFlows = MySQL.BillFlows;

		Bills.findAll({
			include: [{model: BillFlows,
				as: 'billItems' ,
				attributes: ['configId', 'relevantId', 'amount', 'createdAt', 'id']}],
			where: {
				entityType: 'property',
				projectId: req.params.projectId
			}
		}).then(translate)
            .then(duplicate)
			.then(bills => res.send(bills))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, err)));
    }
};
