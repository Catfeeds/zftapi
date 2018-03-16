'use strict';
/**
 * Operations on /environments
 */

const fp = require('lodash/fp');
const {omitSingleNulls, innerValues} = require('../common');

const translate = fp.flow(innerValues,
    fp.omit(['createdAt', 'updatedAt', 'password']), omitSingleNulls);

module.exports = {
    get: async (req, res) => {

        const houseFormat = {
            key: 'houseFormat',
            value: Typedef.HouseFormatLiteral,
        };

        const roomType = {
            key: 'roomType',
            value: Typedef.RoomType,
        };

        const operationStatus = {
            key: 'operationStatus',
            value: Typedef.OperationStatusLiteral,
        };

        const orientation = {
            key: 'orientation',
            value: Typedef.OrientationLiteral,
        };

        const environments = [
            houseFormat,
            roomType,
            operationStatus,
            orientation];

        if (!req.isAuthenticated()) {
            return res.send(fp.compact(environments));
        }
        const user = fp.getOr({})('user')(req);

        const Auth = MySQL.Auth;

        return Auth.findById(user.id).then(auth => {
            MySQL.Banks.findAll({
                attributes: ['tag', 'name']
            }).then(
                banks=>{
                    const data = fp.compact(fp.concat(environments,
                        [
                            {key: 'user', value: translate(auth)}
                            , {key: 'banks', value: banks}
                        ]));
                    res.send(data);
                }
            );
        });

    },
};
