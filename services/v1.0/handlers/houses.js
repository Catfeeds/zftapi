'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp')
const _ = require('lodash')

module.exports = {
	/**
	 * summary: search houses
	 * description: pass hid or query parameter to get houese list

	 * parameters: hfmt, community, searchkey, status, division, rooms, floors, housetype, offset, limit
	 * produces: application/json
	 * responses: 200, 400
	 */
	get: function getHouse(req, res, next) {
		/**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
			//TODO: implement this ASAP
		const proxy = require('../../proxy/proxy');
		proxy.delegate(req.route.path, res, next);
	},
	/**
	 * summary: save house
	 * description: save house information

	 * parameters: body
	 * produces: application/json
	 * responses: 200, 400
	 */
	post: function saveHouse(req, res) {
		/**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
		let body = req.body;
		// if(!Util.ParameterCheck(body, ['hFmt', 'projectId', 'location', 'community', 'roomNumber', 'area', 'tFloor'])){
		//     return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
		// }

		// if(!Typedef.isHouseFormat(body.hFmt)){
		//     return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERERROR, {'hFmt': body.hFmt}));
		// }

		const Houses = MySQL.Houses;
		const HouseType = MySQL.HouseType;
		const GeoLocation = MySQL.GeoLocation;
		const sequelize = MySQL.Sequelize;

		sequelize.transaction(t =>
			Houses.create(_.omit(body, ['location', 'houseType']), {transaction: t})
				.then(house => {
					GeoLocation.create(_.assign({}, _.get(body, 'location'), {houseId: house.id}), {transaction: t});
					return house;
				})
				.then(house => fp.map(type => _.assign({}, type, {houseId: house.id}))(_.get(body, 'houseType')))
				.then(types => Promise.all(fp.map(type => HouseType.create(type, {transaction: t}))(types)))
		).then(results => res.send(200, ErrorCode.ack(ErrorCode.OK, {req: req.body, res: results})))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, err)));

	}
};
