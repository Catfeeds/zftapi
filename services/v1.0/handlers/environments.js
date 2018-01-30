'use strict';
/**
 * Operations on /environments
 */

const fp = require('lodash/fp');

module.exports = {
    get: async (req, res) => {

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

        const projectId = (req.isAuthenticated() && !fp.isEmpty(req.user)) ?
            [{
                key: 'user',
                value: fp.omit('id')(req.user)
            }] : [];

        res.send(fp.compact(fp.concat(environments, projectId)));
    },
};
