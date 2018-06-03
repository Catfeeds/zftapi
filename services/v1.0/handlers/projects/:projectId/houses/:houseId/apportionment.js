'use strict';

const fp = require('lodash/fp');
const {defaultDeviceShare} = require(
    '../../../../../common');

/**
 * Operations on /projects/:id/houses/:id/apportionment
 */

const applyDefaultToEmpty = (projectId, houseId) => houseModel => {
    const house = fp.isEmpty(houseModel) ? {rooms: []} : houseModel.toJSON();
    if (fp.isEmpty(fp.get('devices')(house))) {
        return [];
    }
    return fp.isEmpty(house.houseApportionments) ?
        defaultDeviceShare(projectId, houseId, house.rooms)
        : fp.map(r => fp.defaults(r)({
            houseId,
            projectId,
            value: Number(r.value),
        }))(house.houseApportionments);
};

module.exports = {
    get: async (req, res) => {
        const {projectId, houseId} = req.params;

        return retrieveExistingSharingSetting(MySQL)(houseId, projectId).
            then(applyDefaultToEmpty(houseId, projectId)).
            then(
                result => {
                    res.send(result);
                },
            ).catch(err => {
                log.error(err, projectId, houseId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            });
    },
    put: async (req, res) => {
        const projectId = req.params.projectId;
        const houseId = req.params.houseId;

        const newSettings = req.body;

        const {mode = 'MANUAL'} = req.query;

        const defaultSharing = await retrieveExistingSharingSetting(MySQL)(
            houseId, projectId).
            then(a => a.toJSON()).
            then(house => defaultDeviceShare(house.projectId, house.id,
                fp.map('id')(house.rooms)));
        const toSave = mode.toUpperCase() === 'AUTO' ? defaultSharing :
            fp.map(fp.defaults({projectId, houseId}))(newSettings);

        //default mode is MANUAL

        //check percent
        const totalPercent = fp.sum(fp.map('value')(newSettings));
        if (totalPercent !== 100) {
            return res.send(403, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: 'Total share value is not 100%'}));
        }

        const diff = fp.differenceBy(
            fp.pipe(fp.get('roomId'), a => a.toString()))(newSettings)(
            defaultSharing);
        if (!fp.isEmpty(diff)) {
            return res.send(403, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: `Not all rooms are under contract ${diff}`}));
        }

        return MySQL.Sequelize.transaction(t => Promise.all([
            MySQL.HouseApportionment.destroy(
                {where: {houseId}, transaction: t}),
            MySQL.HouseApportionment.bulkCreate(toSave,
                {transaction: t, updateOnDuplicate: true}).
                then(() => console.log('bulkCreate'))])).
            then(() => {
                res.send(204);
            }).
            catch(err => {
                log.error(err, projectId, houseId, body);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            });
    },
};

const retrieveExistingSharingSetting = MySQL => async (houseId, projectId) =>
    MySQL.Houses.findById(houseId, {
        where: {
            projectId,
        },
        include: [
            {
                model: MySQL.Rooms,
                as: 'rooms',
                required: true,
                attributes: [
                    'id',
                    'type',
                    'name',
                    'config',
                    'orientation',
                    'roomArea'],
                include: [
                    {
                        model: MySQL.Contracts,
                        required: true,
                        attributes: ['id'],
                        where: {
                            status: Typedef.ContractStatus.ONGOING,
                        },
                    }],
            }, {
                model: MySQL.HouseApportionment,
                attributes: ['roomId', 'value'],
                required: false,
            }],
    });
