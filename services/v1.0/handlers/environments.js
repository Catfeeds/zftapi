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

        try {
            const contract = await  MySQL.Contracts.findOne({
                where: {
                    userId: user.id
                    , status: Typedef.ContractStatus.ONGOING
                }
            });
            const auth = await Auth.findById(user.id);
            const banks = await MySQL.Banks.findAll({
                attributes: ['tag', 'name']
            });
            const projectId = fp.getOr(null)('projectId')(auth);

            const data = fp.compact(fp.concat(environments,
                [
                    {key: 'user', value: translate(auth)}
                    , {key: 'banks', value: banks}
                    , contract ? {key: 'contract', value: contract} : null
                    , projectId ? {key: 'projectId', value: projectId} : null
                ]
            ));
            res.send(data);
        }
        catch(e){
            log.error(e);
            res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        }
    },
};
