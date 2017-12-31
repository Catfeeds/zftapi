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

const filterFields = fp.identity;

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

		const sequelize = MySQL.Sequelize;

		const createBill = (contract, bill, t) => Bills.create(bill, {transaction: t})
			.then(dbBill => Promise.all(
				fp.map(bill => BillFlows.create(bill, {transaction: t}))(billItems(contract, dbBill))
				)
			);

		sequelize.transaction(t =>
			extractUser(req)
				.then(user => Users.findOrCreate({where: {accountName: user.accountName, id: user.id}, defaults: user, transaction: t}))
				.then(dbUser => extractContract(req, _.get(dbUser, '[0]')))
				.then(contract => Contracts.create(contract, {transaction: t}))
				.then(contract => Promise.all(
					fp.map(bill => createBill(contract, bill, t))(generateBills(contract)))
				)
		).then(results => res.send(201, ErrorCode.ack(ErrorCode.OK, {})))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, err)));

	},
	get: function getContracts(req, res) {
		const Contracts = MySQL.Contracts;
		const Users = MySQL.Users;
		const projectId = req.params.projectId;
		Contracts.findAll({include: [Users], where: {projectId}})
			.then(filterFields)
			.then(contracts => res.send(contracts))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, err)));
	}
};
