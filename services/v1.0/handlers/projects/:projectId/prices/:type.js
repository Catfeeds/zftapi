'use strict';

const fp = require('lodash/fp');

module.exports = {
    put: async (req, res) => {
        const projectId = req.params.projectId;
        const type = req.params.type;

        const body = req.body;

        if (!Util.ParameterCheck(body,
            ['category', 'price'],
        )) {
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED,
                {error: 'please provide category & price in the body'}));
        }

        const getHouseIds = async () => {

            const where = fp.assign({
                projectId: projectId,
                status: {$ne: Typedef.HouseStatus.DELETED},
            })(body.houseIds ? {id: {$in: body.houseIds}} : {});

            const houses = await MySQL.Houses.findAll({
                where: where,
                attributes: ['id'],
            });

            return fp.map('id')(houses);
        };

        let t;
        try {
            const houseIds = await getHouseIds();
            const devicePrices = await MySQL.HouseDevicePrice.findAll({
                where: {
                    sourceId: {$in: houseIds},
                    projectId: projectId,
                    type: type,
                    category: body.category,
                },
            });

            //
            const updateIds = fp.map(price => {
                return price.id;
            })(devicePrices);

            const updateHouseIds = fp.map(price => {
                return price.sourceId;
            })(devicePrices);
            const createIds = fp.difference(houseIds, updateHouseIds);

            const createPrices = fp.map(id => {
                return {
                    projectId: projectId,
                    sourceId: id,
                    type: type,
                    category: body.category,
                    price: body.price,
                };
            })(createIds);

            t = await MySQL.Sequelize.transaction({autocommit: false});

            await MySQL.HouseDevicePrice.update(
                {
                    price: body.price,
                },
                {
                    where: {
                        id: updateIds,
                    },
                    transaction: t,
                },
            );

            await MySQL.HouseDevicePrice.bulkCreate(createPrices,
                {transaction: t});

            await t.commit();

            res.send(204);
        }
        catch (e) {
            await t.rollback();
            log.error(e, projectId, type, body);
            res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        }
    },
};
