'use strict';
/**
 * Operations on /environments
 */

const _ = require('lodash');

module.exports = {
	get: (req, res) => {

		const houseFormat = {
			key: 'houseFormat',
			value: Typedef.HouseFormatLiteral
		};

		const roomType = {
			key: 'roomType',
			value: Typedef.RoomType
		};

		const operationStatus = {
			key: 'operationStatus',
			value: Typedef.OperationStatusLiteral
		};

		const orientation = {
			key: 'orientation',
			value: Typedef.OrientationLiteral
		};

		const environments = [houseFormat, roomType, operationStatus, orientation];

		const projectId = (req.isAuthenticated() && !_.isEmpty(req.user)) ?
		[{
			key: 'user',
			value: _.omit(req.user, 'id')
		}] : [];


		res.send(_.compact(_.concat(environments, projectId)));
	},
};
