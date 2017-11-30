'use strict';
/**
 * Operations on /contracts
 */
const fp = require('lodash/fp');
const extractContract = require('../../../transformers/contractExtractor').extract;
const extractUser = require('../../../transformers/userExtractor').extract;
const generateBills = require('../../../transformers/billGenerator').generate;

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
		const sequelize = MySQL.Sequelize;

		sequelize.transaction(t =>
			Users.create(extractUser(req), {transaction: t})
				.then(user => Contracts.create(extractContract(req, user), {transaction: t}))
				.then(contract =>
					fp.map(bill => Bills.create(bill, {transaction: t}))(generateBills(contract)))
				.all()
		).then((results) => res.send(201, ErrorCode.ack(ErrorCode.OK, {results: results})))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, err)));

	},
	//TODO: pure testing purpose, remove if necessary
	get: function getContracts(req, res, next) {
		res.send([]);
		return next();
	}
};
