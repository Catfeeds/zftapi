'use strict';
/**
 * Operations on /bills
 */
const _ = require('lodash');
const fp = require('lodash/fp');
const moment = require('moment');
const omitSingleNulls = require('../../../common').omitSingleNulls;
const innerValues = require('../../../common').innerValues;
const singleRoomTranslate = require('../../../common').singleRoomTranslate;
const includeContracts = require('../../../common').includeContracts;


const omitFields = item => _.omit(item, ['metadata', 'createdAt', 'updatedAt']);
const formatRoom = item => fp.defaults(item)({room: singleRoomTranslate(item.contract.dataValues.room)});

const formatUser = item => fp.defaults(item)({
	user: _.pick(item.contract.user, ['accountName', 'name', 'id', 'mobile'])
});

const formatContract = item => fp.defaults(item)({
	contract: _.pick(item.contract, ['id', 'from', 'to'])
});

const translate = (models, pagingInfo) => {
	const single = _.flow(innerValues, omitSingleNulls, formatRoom, formatUser, formatContract, omitFields);
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
	get: async function (req, res) {
		const Bills = MySQL.Bills;
		const BillFlows = MySQL.BillFlows;

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

		return Bills.findAndCountAll({
			include: [{
				model: BillFlows,
				as: 'billItems',
				attributes: ['configId', 'amount', 'createdAt', 'id']
			}, contractFilter(houseFormat)],
			where: {
				entityType: 'property',
				projectId,
				startDate: {
					$lt: moment().unix()
				}
			},
			offset: pagingInfo.skip,
			limit: pagingInfo.size
		}).then(models => translate(models, pagingInfo))
			.then(bills => res.send(bills))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	}
};
