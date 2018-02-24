'use strict';
const moment = require('moment');

module.exports = {
    put: (req, res) => {
        const projectId = req.params.projectId;
        const houseId = req.params.houseId;
        const type = req.params.type;

        const body = req.body;

        if(!Util.ParameterCheck(body,
            ['category', 'price']
        )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, {error: 'missing query params houseFormat'}));
        }

        MySQL.HouseDevicePrice.findOne({
            where:{
                endDate: 0,
                projectId: projectId,
                houseId: houseId,
                type: type,
                category: body.category
            }
        }).then(
            price=>{
                if(price.price === body.price){
                    return res.send(204);
                }

                const now = moment().unix();
                if(price.startDate === now){
                    MySQL.HouseDevicePrice.update(
                        {
                            price: body.price
                        },
                        {
                            where:{
                                id: price.id
                            }
                        }
                    ).then(
                        ()=>{
                            res.send(201);
                        },
                        err=>{
                            log.error(err, projectId, houseId, type, body);
                            re.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
                        }
                    );
                }
                else {
                    MySQL.Sequelize.transaction(t => {
                        return MySQL.HouseDevicePrice.update(
                            {
                                endDate: moment().subtract(1, 'days').unix()
                            },
                            {
                                where: {
                                    id: price.id
                                },
                                transaction: t
                            }
                        ).then(
                            () => {
                                return MySQL.HouseDevicePrice.create(
                                    {
                                        projectId: projectId,
                                        houseId: houseId,
                                        type: type,
                                        category: body.category,
                                        price: body.price,
                                        startDate: now,
                                    },
                                    {transaction: t}
                                );
                            }
                        );
                    }).then(
                        ()=>{
                            res.send(201);
                        }
                    ).catch(
                        err=>{
                            log.error(err, projectId, houseId, type, body);
                            re.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
                        }
                    );
                }

            }
        );
    }
};
