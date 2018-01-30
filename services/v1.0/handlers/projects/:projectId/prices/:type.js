'use strict';

const _ = require('lodash');
const fp = require('lodash/fp');

module.exports = {
    put: (req, res) => {

        (async()=>{
            const projectId = req.params.projectId;
            const type = req.params.type;

            const body = req.body;

            if(!Util.ParameterCheck(body,
                ['category', 'price']
            )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, {error: 'missing query params houseFormat'}));
            }

            const getHouseIds = async()=>{

                const where = _.assign(
                    {
                        projectId: projectId,
                        status: {$ne: Typedef.HouseStatus.DELETED},
                    },
                    body.houseIds ? {id:{$in: body.houseIds}} : {}
                );

                const houses = await MySQL.Houses.findAll({
                    where: where,
                    attributes: ['id']
                });

                return fp.map(house=>{return house.id;})(houses);
            };


            try {
                const houseIds = await getHouseIds();
                const devicePrices = await MySQL.HouseDevicePrice.findAll({
                    where: {
                        sourceId: {$in: houseIds},
                        projectId: projectId,
                        type: type,
                        category: body.category
                    }
                });

                //
                const updateIds = fp.map(price => {
                    return price.id;
                })(devicePrices);

                const updateHouseIds = fp.map(price => {
                    return price.sourceId;
                })(devicePrices);
                const createIds = _.difference(houseIds, updateHouseIds);

                const createPrices = fp.map(id => {
                    return {
                        projectId: projectId,
                        sourceId: id,
                        type: type,
                        category: body.category,
                        price: body.price
                    };
                })(createIds);

                const t = await MySQL.Sequelize.transaction();

                await MySQL.HouseDevicePrice.update(
                    {
                        price: body.price
                    },
                    {
                        where:{
                            id: updateIds
                        },
                        transaction: t
                    }
                );

                await MySQL.HouseDevicePrice.bulkCreate(createPrices, {transaction: t});

                await t.commit();

                res.send(204);
            }
            catch(e){
                log.error(e, projectId, type, body);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }




        })();
    }
};
