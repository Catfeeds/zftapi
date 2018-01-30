'use strict';

const moment = require('moment');
const _ = require('lodash');
const fp = require('lodash/fp');

module.exports = {
    get: (req, res) => {
        const projectId = req.params.projectId;
        const houseId = req.params.houseId;

        MySQL.HouseDevicePrice.findAll({
            where:{
                projectId: projectId,
                sourceId: houseId
            },
            attributes:['category', 'type', 'price']
        }).then(
            prices=>{
                res.send(prices);
            },
            err=>{
                log.error(err, projectId, houseId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        );
    }
};
