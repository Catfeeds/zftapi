'use strict';
/**
 * Operations on /contracts
 */
const fp = require('lodash/fp');
const extractContract = require('../../../../../transformers/contractExtractor').extract;
const extractUser = require('../../../../../transformers/userExtractor').extract;
const generateBills = require('../../../../../transformers/billGenerator').generate;
const billItems = require('../../../../../transformers/billItemsGenerator').generate;
const omitSingleNulls = require('../../../../../services/v1.0/common').omitSingleNulls;
const innerValues = require('../../../../../services/v1.0/common').innerValues;
const assignNewId = require('../../../../../services/v1.0/common').assignNewId;
const singleRoomTranslate = require('../../../common').singleRoomTranslate;
const jsonProcess = require('../../../common').jsonProcess;
const houseConnection = require('../../../common').houseConnection;

const omitFields = fp.omit(['userId', 'createdAt', 'updatedAt']);
const roomTranslate = item => fp.defaults(item)({room: singleRoomTranslate(item.room)});

const translate = (models, pagingInfo) => {
	const single = fp.pipe(innerValues, omitSingleNulls, omitFields, jsonProcess, roomTranslate);
	return {
		paging: {
			count: models.count,
			index: pagingInfo.index,
			size: pagingInfo.size
		},
		data: fp.map(single)(models.rows)
	};
};

const validateContract = async (contract) => {
	if (contract.from >= contract.to) {
		throw new Error(`Invalid contract time period : from ${contract.from} to ${contract.to}.`);
	}
	return contract;
};

module.exports = {
	/**
	 * summary: save contract
	 * description: save contract information

	 * parameters: body
	 * produces: application/json
	 * responses: 200, 400, 401, 406
	 */
	post: async function createContract(req, res) {
		/**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
		const Contracts = MySQL.Contracts;
		const Users = MySQL.Users;
		const Bills = MySQL.Bills;
		const BillFlows = MySQL.BillFlows;
		const CashAccount = MySQL.CashAccount;

		const sequelize = MySQL.Sequelize;

		const createBill = (contract, bill, t) => Bills.create(assignNewId(bill), {transaction: t})
			.then(dbBill =>
				Promise.all(fp.map(billflow =>
					BillFlows.create(assignNewId(billflow), {transaction: t}))(billItems(contract, dbBill))));

		const checkRoomAvailability = async (contract, t) => {
			const roomId = contract.roomId;
			return Contracts.count({
				where: {
					roomId,
					status: Typedef.ContractStatus.ONGOING,
					$or: [{
						from: {
							$lte: contract.from
						},
						to: {
							$gte: contract.from
						}
					}, {
						from: {
							$lte: contract.to
						},
						to: {
							$gte: contract.to
						}
					}]
				},
				transaction: t
			}).then(result => {
				console.log(`rooms under contract ${contract.id}`, result);
				if (result > 0) {
					throw new Error(`room ${contract.roomId} is unavailable`);
				}
				return contract;
			});
		};

		return sequelize.transaction(t =>
			extractUser(req)
				.then(user => Users.findOrCreate({
					where: {accountName: user.accountName, id: user.id},
					defaults: assignNewId(user),
					transaction: t
				}))
				.then(dbUsers => {
					const user = fp.head(dbUsers);
					return CashAccount.findOrCreate({
						where: {userId: user.id},
						defaults: assignNewId({userId: user.id}),
						transaction: t
					}).then(() => user);
				})
				.then(dbUser => extractContract(req, dbUser))
				.then(contract => validateContract(contract))
				.then(contract => checkRoomAvailability(contract, t))
				.then(contract => Contracts.create(assignNewId(contract), {transaction: t}))
				.then(contract => Promise.all(
					fp.map(bill => createBill(contract, bill, t))(generateBills(contract)))
				)
		).then(() => res.send(201, ErrorCode.ack(ErrorCode.OK, {})))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));

	},
	get: async function getContracts(req, res) {
		const Contracts = MySQL.Contracts;
		const Users = MySQL.Users;
		const Rooms = MySQL.Rooms;
		const Houses = MySQL.Houses;
		const Building = MySQL.Building;
		const GeoLocation = MySQL.GeoLocation;
		const CashAccount = MySQL.CashAccount;
		const projectId = req.params.projectId;
		const status = fp.getOr(Typedef.ContractStatus.ONGOING)('params.status')(req).toUpperCase();
		const query = req.query;
		const houseFormat = query.houseFormat;
		const pagingInfo = Util.PagingInfo(query.index, query.size, true);

		return Contracts.findAndCountAll({
			include: [{
				model: Users,
				required: true,
				include: [{model: CashAccount, as: 'cashAccount', attributes: ['balance']}]
			}, houseConnection(Houses, Building, GeoLocation, Rooms)(houseFormat)],
			distinct: true,
			where: {projectId, status},
			offset: pagingInfo.skip,
			limit: pagingInfo.size
		}).then(data => translate(data, pagingInfo))
			.then(contracts => res.send(contracts))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	}
};
