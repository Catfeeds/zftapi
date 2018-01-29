'use strict';

const moment = require('moment');
const _ = require('lodash');
const fp = require('lodash/fp');

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
                projectId: projectId,
                sourceId: houseId,
                type: type,
                category: body.category
            }
        }).then(
            price=>{
                const createOrUpdate = ()=>{
                    if(!price){
                        return MySQL.HouseDevicePrice.create({
                            projectId: projectId,
                            sourceId: houseId,
                            type: type,
                            category: body.category,
                            price: body.price
                        });
                    }
                    else{
                        return MySQL.HouseDevicePrice.update(
                            {
                                price: body.price
                            },
                            {
                                where:{
                                    id: price.id
                                }
                            }
                        );
                    }
                };

                createOrUpdate().then(
                    ()=>{
                        res.send(204);
                    },
                    err=>{
                        log.error(err, projectId, houseId, type);
                    }
                );
            }
        );
    }
};
