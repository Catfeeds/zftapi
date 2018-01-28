'use strict';
/**
 * Operations on /projects/{projectid}
 */

const fp = require('lodash/fp');
const innerValues = require('../../common').innerValues;

const omitFields = fp.omit(['pid', 'createdAt', 'updatedAt']);

module.exports = {
    get: async function getCredentials(req, res) {
        const Projects = MySQL.Projects;
        const projectId = req.params.projectId;

        return Projects.findOne({
            where: {
                pid: projectId
            }
        })
            .then(fp.pipe(innerValues, omitFields))
            .then(items => res.send(items))
            .catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    },
    put: async function (req, res) {
        const body = req.body;
        const Projects = MySQL.Projects;

        const pid = req.params.projectId;
        const dbId = fp.get('id')(body);

        if (fp.isUndefined(dbId)) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {error: 'please provide db id of this project'}));
        }

        const guardFields = fp.omit(['id', 'pid', 'externalId'])(body);

        Projects.update(guardFields, {
            where: {
                pid,
                dbId
            }
        }).then(project => res.send(200, ErrorCode.ack(ErrorCode.OK, {id: project.id})))
            .catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    }
};
