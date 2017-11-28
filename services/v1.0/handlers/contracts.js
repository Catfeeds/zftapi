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
		Contracts.sync().then(() => {
			// Table created
			Contracts.create({
				hrid: 23,
				uid: 223,
				from: 1000,
				to: 2000,
				strategy: 'strategy',
				expenses: 'expenses',
				paytime: 'F03',
				signtime: 3000
			}).then(() => {
				res.send(201, ErrorCode.ack(ErrorCode.OK, {}));
				next();
			}).catch((e) => {
				console.log(e);
				res.send(503, ErrorCode.ack(ErrorCode.DATABASEEXEC, e))
				next();
				}
			);
		});
		console.log('init..');
	},
	//TODO: pure testing purpose, remove if necessary
	get: function getContracts(req, res, next) {
		res.send([]);
		return next();
	}
};
