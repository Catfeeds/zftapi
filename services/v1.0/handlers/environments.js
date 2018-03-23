'use strict';
/**
 * Operations on /environments
 */

const fp = require('lodash/fp');
const {omitSingleNulls, innerValues} = require('../common');

const translate = fp.flow(innerValues,
    fp.omit(['createdAt', 'updatedAt', 'password',
        'strategy', 'expenses']), omitSingleNulls);

const pickHouseId = (obj) => fp.defaults({houseId: obj.room.house.id})(obj);
const omitRoomEntry = fp.omit('room');
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
            const userProfile = await MySQL.Users.findOne({
                where: {
                    authId: user.id
                }
            });

            const contracts = userProfile ? await  MySQL.Contracts.findAll({
                where: {
                    userId: userProfile.id
                    , status: Typedef.ContractStatus.ONGOING
                },
                include: [{
                    model: MySQL.Rooms,
                    attributes: ['id'],
                    include: [{
                        model: MySQL.Houses,
                        as: 'house',
                        attributes: ['id']
                    }]
                }]
            }) : null;

            const auth = await Auth.findById(user.id);
            const banks = await MySQL.Banks.findAll({
                attributes: ['tag', 'name']
            });
            const projectId = fp.getOr(null)('projectId')(auth);

            const data = fp.compact(fp.concat(environments,
                [
                    auth.level === 'USER' ? {key: 'user',
                        value: fp.defaults({authId: user.id, level: 'USER'})(translate(userProfile))} :
                        {key: 'user', value: fp.defaults({authId: auth.id})(translate(auth))}
                    , {key: 'banks', value: banks}
                    , contracts ? {key: 'contracts', value:
                        fp.map(fp.pipe(translate, pickHouseId, omitRoomEntry))(contracts)}
                        : null
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
