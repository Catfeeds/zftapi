'use strict';
/**
 * Operations on /healthCheck
 */
module.exports = {
	get: function getBills(req, res) {
		const sequelize = MySQL.Sequelize;
		sequelize
			.query(
				'SELECT 1 FROM houses limit 1',
				{raw: true, plain: false}
			)
			.then(state => {
				res.send(200, ErrorCode.ack(ErrorCode.OK, state))
			})

	}
};
