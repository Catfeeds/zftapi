'use strict';

module.exports = {
    get: (req, res) => {
        const projectId = req.params.projectId;
        const houseId = req.params.houseId;

        MySQL.HouseDevicePrice.findAll({
            where:{
                projectId: projectId,
                houseId: houseId,
                expiredDate: 0
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
