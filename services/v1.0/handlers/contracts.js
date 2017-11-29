'use strict';
/**
 * Operations on /contracts
 */

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
			Users.create({
				name: 'Abraham',
				accountName: `Random${new Date().getTime()}`,
				mobile: '12345678911',
				documentId: '12345678911',
				documentType: 1,
				gender: 'M'
			}, {transaction: t})
				.then(user => Contracts.create({
					hrId: 23,
					userId: user.id,
					from: 1000,
					to: 2000,
					strategy: 'strategy',
					expenses: 'expenses',
					paytime: 'F03',
					signtime: 3000
				}, {transaction: t}))
				.then(contract => Bills.create({
					flow: 'receive',
					entity: 'landlord',
					projectId: 'projectid',
					relativeID: contract.id,
					metadata: ''
				}, {transaction: t}))
		).then(function (result) {
			// Transaction has been committed
			// result is whatever the result of the promise chain returned to the transaction callback
			res.send(201, ErrorCode.ack(ErrorCode.OK, result));
			next();
		}).catch(function (err) {
			// Transaction has been rolled back
			// err is whatever rejected the promise chain returned to the transaction callback
			console.log(err);
			res.send(503, ErrorCode.ack(ErrorCode.DATABASEEXEC, err))
			next();
		});

	},
	//TODO: pure testing purpose, remove if necessary
	get: function getContracts(req, res, next) {
		res.send([]);
		return next();
	}
};
