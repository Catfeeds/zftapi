'use strict';
/**
 * Operations on /projects/{projectid}
 */

const _ = require('lodash');

const innerValues = item => item.dataValues;
const omitFields = item => _.omit(item, ['pid', 'createdAt', 'updatedAt']);

module.exports = {
	get: async function getCredentials(req, res) {
		const Projects = MySQL.Projects;
		const projectId = req.params.projectId;

		return Projects.findOne({
			where: {
				pid: projectId
			}
		})
			.then(item => {
				console.log(item);
				return _.flow(innerValues, omitFields)(item)
			})
			.then(items => res.send(items))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	},
	put: async function (req, res) {
		const body = req.body;
		const Projects = MySQL.Projects;

		const pid = req.params.projectId;
		const dbId = _.get(body, 'id');

		if (_.isUndefined(dbId)) {
			return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {error: "please provide db id of this project"}));
		}

		const guardFields = _.omit(body, ['id', 'pid', 'externalId']);

		Projects.update(guardFields, {
			where: {
				pid,
				dbId
			}
		}).then(project =>
			res.send(200, ErrorCode.ack(ErrorCode.OK, {id: project.id}))
		).catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	}
};
