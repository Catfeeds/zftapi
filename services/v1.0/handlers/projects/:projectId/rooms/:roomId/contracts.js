'use strict';

const fp = require('lodash/fp');
const _ = require('lodash');
const omitSingleNulls = require('../../../../../common').omitSingleNulls;
const innerValues = require('../../../../../common').innerValues;
const jsonProcess = require('../../../../../common').jsonProcess;

const omitFields = item => _.omit(item, ['userId', 'createdAt', 'updatedAt']);

const translate = (models, pagingInfo) => {

	const single = _.flow(innerValues, omitSingleNulls, omitFields, jsonProcess);
	return {
		paging: {
			count: models.count,
			index: pagingInfo.index,
			size: pagingInfo.size
		},
		data: fp.map(single)(models.rows)
	}
};

module.exports = {
	get: async (req, res) => {
		const projectId = req.params.projectId;
		const roomId = req.params.roomId;
		const query = req.query;
		const status = _.get(req, 'query.status', Typedef.ContractStatus.ONGOING).toUpperCase();
		const Contracts = MySQL.Contracts;
		console.log(_.get(req, 'params.status'));

		const pagingInfo = Util.PagingInfo(query.index, query.size, true);

		Contracts.findAndCountAll({
			where: {projectId, roomId, status},
			offset: pagingInfo.skip,
			limit: pagingInfo.size
		}).then(data => translate(data, pagingInfo))
			.then(contracts => res.send(contracts))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	}
}