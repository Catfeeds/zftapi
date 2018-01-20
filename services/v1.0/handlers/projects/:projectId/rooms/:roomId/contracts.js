'use strict';

const fp = require('lodash/fp');
const omitSingleNulls = require('../../../../../common').omitSingleNulls;
const innerValues = require('../../../../../common').innerValues;
const jsonProcess = require('../../../../../common').jsonProcess;

const translate = (models, pagingInfo) => {

	const single = fp.pipe(innerValues, omitSingleNulls, jsonProcess);
	return {
		paging: {
			count: models.count,
			index: pagingInfo.index,
			size: pagingInfo.size
		},
		data: fp.map(single)(models.rows)
	};
};

module.exports = {
	get: async (req, res) => {
		const projectId = req.params.projectId;
		const roomId = req.params.roomId;
		const query = req.query;
		const status = fp.getOr('query.status')(Typedef.ContractStatus.ONGOING)(req).toUpperCase();
		const Contracts = MySQL.Contracts;
		const Users = MySQL.Users;

		const pagingInfo = Util.PagingInfo(query.index, query.size, true);

		Contracts.findAndCountAll({
			include: [{model: Users, attributes: ['name', 'mobile']}],
			attributes: ['from', 'to', 'status', 'strategy'],
			distinct: true,
			where: {projectId, roomId, status},
			offset: pagingInfo.skip,
			limit: pagingInfo.size
		}).then(data => translate(data, pagingInfo))
			.then(contracts => res.send(contracts))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	}
};