'use strict';
/**
 * Operations on /contracts
 */
const fp = require('lodash/fp');
const _ = require('lodash');
const extractContract = require('../../../../../transformers/contractExtractor').extract;
const extractUser = require('../../../../../transformers/userExtractor').extract;
const generateBills = require('../../../../../transformers/billGenerator').generate;
const billItems = require('../../../../../transformers/billItemsGenerator').generate;
const omitSingleNulls = require('../../../../../services/v1.0/common').omitSingleNulls;
const innerValues = require('../../../../../services/v1.0/common').innerValues;

const omitFields = item => _.omit(item, ['userId', 'createdAt', 'updatedAt']);

const translate = (models, pagingInfo) => {
	const jsonProcess = (model) => fp.defaults(model)({
		expenses: JSON.parse(model.expenses),
		strategy: JSON.parse(model.strategy)
	});
	const single = _.flow(innerValues, omitSingleNulls, omitFields, jsonProcess);
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
	 * summary: save contract
	 * description: save contract information

	 * parameters: body
	 * produces: application/json
	 * responses: 200, 400, 401, 406
	 */
	post: function createContract(req, res) {
		/**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
		const Contracts = MySQL.Contracts;
		const Users = MySQL.Users;
		const Bills = MySQL.Bills;
		const BillFlows = MySQL.BillFlows;
		const Rooms = MySQL.Rooms;

		const sequelize = MySQL.Sequelize;

		const createBill = (contract, bill, t) => Bills.create(bill, {transaction: t})
			.then(dbBill => Promise.all(
				fp.map(bill => BillFlows.create(bill, {transaction: t}))(billItems(contract, dbBill))
				)
			);

		const occupyRoom = (contract) => {
			return Rooms.update({
				status: Typedef.OperationStatus.INUSE
			}, {
				returning: true,
				where: {
					id: contract.dataValues.roomId,
					status: Typedef.OperationStatus.IDLE
				}
			}).then(result => {
				console.log('update result', result);
				if (result[1] === 0) {
					throw new Error('room is unavailable')
				}
			})
		};

		return sequelize.transaction(t =>
			extractUser(req)
				.then(user => Users.findOrCreate({
					where: {accountName: user.accountName, id: user.id},
					defaults: user,
					transaction: t
				}))
				.then(dbUser => extractContract(req, _.get(dbUser, '[0]')))
				.then(contract => Contracts.create(contract, {transaction: t}))
				.then(contract => {
					const bills = fp.map(bill => createBill(contract, bill, t))(generateBills(contract));
					const roomUpdate = occupyRoom(contract);
					return Promise.all(_.concat(bills, [roomUpdate]));
				})
		).then(results => res.send(201, ErrorCode.ack(ErrorCode.OK, {})))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));

	},
	get: async function getContracts(req, res) {
		const Contracts = MySQL.Contracts;
		const Users = MySQL.Users;
		const Rooms = MySQL.Rooms;
		const Houses = MySQL.Houses;
		const projectId = req.params.projectId;
		const status = _.get(req, 'params.status', Typedef.ContractStatus.ONGOING).toUpperCase();
		const query = req.query;
		const houseFormat = query.houseFormat;
		const pagingInfo = Util.PagingInfo(query.index, query.size, true);

		const userConnection = {
			model: Users, required: true
		};
		const houseConnection = {
			model: Rooms,
			required: true,
			attributes: ['id'],
			include: [
				{
					model: Houses,
					as: 'House',
					required: true,
					attributes: ['id'],
					where: {
						houseFormat
					}
				}
			]
		};
		const includeCondition = _.isEmpty(houseFormat) ?
			[userConnection] : [userConnection, houseConnection];
		return Contracts.findAndCountAll({
			include: includeCondition,
			where: {projectId, status},
			offset: pagingInfo.skip,
			limit: pagingInfo.size
		}).then(data => translate(data, pagingInfo))
			.then(contracts => res.send(contracts))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	}
};
