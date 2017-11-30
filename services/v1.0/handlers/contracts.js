'use strict';
/**
 * Operations on /contracts
 */
const fp = require('lodash/fp');

const extractUser = req => ({
	name: 'Abraham',
	accountName: `Random${new Date().getTime()}`,
	mobile: '12345678911',
	documentId: '12345678911',
	documentType: 1,
	gender: 'M'
});

const extractContract = (req, user) => ({
	hrId: 23,
	userId: user.id,
	from: 1000,
	to: 2000,
	strategy: 'strategy',
	expenses: 'expenses',
	paymentPlan: 'F03',
	signUpTime: 3000
});

const generateBills = contract => [{
	flow: 'receive',
	entity: 'landlord',
	projectId: 'projectid',
	relativeID: contract.id,
	metadata: {}
}];

module.exports = {
	/**
	 * summary: save contract
	 * description: save contract information

	 * parameters: body
	 * produces: application/json
	 * responses: 200, 400, 401, 406
	 */
	post: function createContract(req, res, next) {
		/**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
		const Contracts = MySQL.Contracts;
		const Users = MySQL.Users;
		const Bills = MySQL.Bills;
		const sequelize = MySQL.Sequelize;

		sequelize.transaction((t) =>
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
