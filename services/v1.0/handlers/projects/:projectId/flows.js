'use strict';

const _ = require('lodash');
const fp = require('lodash/fp');
const omitSingleNulls = require('../../../common').omitSingleNulls;
const innerValues = require('../../../common').innerValues;
const includeContracts = require('../../../common').includeContracts;
const singleRoomTranslate = require('../../../common').singleRoomTranslate;


const omitFields = item => _.omit(item, ['billId', 'bill', 'createdAt', 'updatedAt']);
const assignCategory = item => fp.defaults(item)({category: item.bill.type});
const formatRoom = item => fp.defaults(item)({room: singleRoomTranslate(item.bill.contract.dataValues.room)});

const formatUser = item => fp.defaults(item)({
	user: _.pick(item.bill.contract.user, ['accountName', 'name', 'id', 'mobile'])
});
const formatContract = item => fp.defaults(item)({
	contract: _.pick(item.bill.contract, ['id', 'from', 'to'])
});


const translate = (models, pagingInfo) => {
	const single = _.flow(innerValues, omitSingleNulls, formatRoom, formatUser, formatContract, assignCategory, omitFields);
	return {
		paging: {
			count: models.count,
			index: pagingInfo.index,
			size: pagingInfo.size
		},
		data: fp.map(single)(models.rows)
	}
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
		const contractFilter = includeContracts(Contracts, Users, Houses, Building, GeoLocation, Rooms);

		const query = req.query;
		const projectId = req.params.projectId;
		const houseFormat = query.houseFormat;

		const pagingInfo = Util.PagingInfo(query.index, query.size, true);

		BillPayment.findAndCountAll({
			include: [{
				model: Bills,
				include: [contractFilter(houseFormat)],
				attributes: ['id', 'type'],
				required: true
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
}