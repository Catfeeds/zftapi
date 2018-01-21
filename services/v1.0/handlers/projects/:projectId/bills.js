'use strict';
/**
 * Operations on /bills
 */
const fp = require('lodash/fp');
const moment = require('moment');
const omitSingleNulls = require('../../../common').omitSingleNulls;
const innerValues = require('../../../common').innerValues;
const singleRoomTranslate = require('../../../common').singleRoomTranslate;
const includeContracts = require('../../../common').includeContracts;


const omitFields = fp.omit(['metadata', 'createdAt', 'updatedAt']);
const formatRoom = item => fp.defaults(item)({room: singleRoomTranslate(item.contract.dataValues.room)});

const formatUser = item => fp.defaults(item)({
	user: fp.pick(['accountName', 'name', 'id', 'mobile'])(item.contract.user)
});

const formatContract = item => fp.defaults(item)({
	contract: fp.pick(['id', 'from', 'to'])(item.contract)
});

const pickUpFirstPayment = bill => fp.defaults(bill)({payments: fp.take(1)(bill.payments)});

const translate = (models, pagingInfo) => {
	const single = fp.pipe(innerValues, omitSingleNulls, formatRoom, formatUser, formatContract, omitFields, pickUpFirstPayment);
	return {
		paging: {
			count: models.count,
			index: pagingInfo.index,
			size: pagingInfo.size
		},
		data: fp.map(single)(models.rows)
	};
};

module.exports = {
	get: async function (req, res) {
		const Bills = MySQL.Bills;
		const BillFlows = MySQL.BillFlows;
		const BillPayment = MySQL.BillPayment;

		const Contracts = MySQL.Contracts;
		const Users = MySQL.Users;
		const Rooms = MySQL.Rooms;
		const Houses = MySQL.Houses;
		const Building = MySQL.Building;
		const GeoLocation = MySQL.GeoLocation;
		const contractFilter = includeContracts(Contracts, Users, Houses, Building, GeoLocation, Rooms);

		const query = req.query;

		const Sequelize = MySQL.Sequelize;

		const projectId = req.params.projectId;
		const houseFormat = query.houseFormat;

		const paymentsFilter = (flag => {
			if (fp.isUndefined(flag)) {
				return undefined;
			}
			const billPaymentFilter = Sequelize.literal(`( select billId from billpayment where projectId = ${projectId} )`);
			return flag === 'true' ?
				{$in: billPaymentFilter}
				: {$notIn: billPaymentFilter};
		})(fp.get('query.paid')(req));

		const pagingInfo = Util.PagingInfo(query.index, query.size, true);

		return Bills.findAndCountAll({
			include: [{
				model: BillFlows,
				as: 'billItems',
				attributes: ['configId', 'amount', 'createdAt', 'id']
			}, {
				model: BillPayment,
				required: false,
				as: 'payments',
				attributes: ['id', 'amount', 'paymentChannel', 'operator', 'paidAt', 'remark', 'status']
			}, contractFilter(houseFormat)],
			distinct: true,
			where: fp.defaults({
				entityType: 'property',
				projectId,
				startDate: {
					$lt: moment().unix()
				},
			})(paymentsFilter ? {id: paymentsFilter} : {}),
			offset: pagingInfo.skip,
			limit: pagingInfo.size
		}).then(models => translate(models, pagingInfo))
			.then(bills => res.send(bills))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	}
};
