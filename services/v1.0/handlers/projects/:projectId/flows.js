'use strict';

const fp = require('lodash/fp');
const omitSingleNulls = require('../../../common').omitSingleNulls;
const innerValues = require('../../../common').innerValues;
const includeContracts = require('../../../common').includeContracts;
const userConnection = require('../../../common').userConnection;
const singleRoomTranslate = require('../../../common').singleRoomTranslate;


const omitFields = fp.omit([
	'userId', 'billId', 'bill', 'auth', 'topup',
	'billpayment', 'operatorInfo', 'flowId', 'createdAt', 'updatedAt',
	'contractId'
]);

const formatRoom = room => item => fp.defaults(item)({room: singleRoomTranslate(fp.get(room)(item))});

const formatUser = user => item => fp.defaults(item)({
	user: fp.pick(['accountName', 'name', 'id', 'mobile'])(fp.get(user)(item))
});

const formatContract = contract => item => fp.defaults(item)({
	contract: fp.pick(['id', 'from', 'to', 'status', 'actualEndDate'])(fp.get(contract)(item))
});

const formatOperator = operator => item => fp.defaults(item)({operator: fp.get(operator)(item)});

const translate = (models, pagingInfo) => {
	const singleBillPayment = fp.pipe(innerValues, omitSingleNulls, formatRoom('bill.contract.dataValues.room'),
		formatOperator('auth'), formatUser('bill.contract.user'), formatContract('bill.contract'), omitFields);
	const singleTopUp = fp.pipe(innerValues, omitSingleNulls, formatRoom('contract.dataValues.room'),
		formatUser('user'), formatContract('contract'), formatOperator('operatorInfo'), omitFields);

	const single = (item) => fp.pipe(omitSingleNulls, omitFields)(
		fp.defaults(
			!fp.isNull(item.topup) ?
				singleTopUp(item.topup) : singleBillPayment(item.billpayment))(item.dataValues));

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
	get: async (req, res) => {
		const BillPayment = MySQL.BillPayment;
		const Bills = MySQL.Bills;
		const Contracts = MySQL.Contracts;
		const Users = MySQL.Users;
		const Rooms = MySQL.Rooms;
		const Houses = MySQL.Houses;
		const Building = MySQL.Building;
		const GeoLocation = MySQL.GeoLocation;
		const Auth = MySQL.Auth;
		const Flows = MySQL.Flows;
		const Topup = MySQL.Topup;
		const contractFilter = includeContracts(Contracts, Users, Houses, Building, GeoLocation, Rooms);

		const query = req.query;
		const projectId = req.params.projectId;
		const houseFormat = query.houseFormat;

		const pagingInfo = Util.PagingInfo(query.index, query.size, true);
		const operatorConnection = {
			model: Auth,
			attributes: ['id', 'username']
		};
		Flows.findAndCountAll({
			include: [{
				model: BillPayment,
				include: [{
					model: Bills,
					include: [contractFilter(houseFormat, {})],
					attributes: ['id', 'type'],
					required: true
				}, operatorConnection]
			}, {
				model: Topup,
				include: [userConnection(Users), contractFilter(houseFormat, {}), fp.merge({
					as: 'operatorInfo'
				}, operatorConnection)]
			}],
			where: {
				projectId
			},
			distinct: true,
			offset: pagingInfo.skip,
			limit: pagingInfo.size
		}).then(models => translate(models, pagingInfo))
			.then(bills => res.send(bills))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	}
};