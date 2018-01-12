'use strict';
/**
 * Operations on /bills
 */
const _ = require('lodash');
const fp = require('lodash/fp');
const moment = require('moment');
const omitSingleNulls = require('../../../../../services/v1.0/common').omitSingleNulls;
const innerValues = require('../../../../../services/v1.0/common').innerValues;

const omitFields = item => _.omit(item, ['metadata', 'createdAt', 'updatedAt']);

const translate = (models, pagingInfo) => {
	const single = _.flow(innerValues, omitSingleNulls, omitFields);
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
	/**
	 * summary: create bill info
	 * description: save contract information

	 * parameters: body
	 * produces: application/json
	 * responses: 200, 400
	 */
	post: function createBills(req, res, next) {
		/**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
	},
	get: async function (req, res) {
		const Bills = MySQL.Bills;
		const BillFlows = MySQL.BillFlows;

		const query = req.query;
		const pagingInfo = Util.PagingInfo(query.index, query.size, true);

		return Bills.findAndCountAll({
			include: [{
				model: BillFlows,
				as: 'billItems',
				attributes: ['configId', 'amount', 'createdAt', 'id']
			}],
			where: {
				entityType: 'property',
				projectId: req.params.projectId,
				startDate: {
					$lt: moment().unix()
				}
			},
			offset: pagingInfo.skip,
			limit: pagingInfo.size
		}).then(models => translate(models, pagingInfo))
			.then(bills => res.send(bills))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	}
};
