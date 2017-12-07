'use strict';
const common = Include("/services/v1.0/common");

/**
 * Operations on /houses/{hid}
 */
module.exports = {
    /**
     * summary: get specified houses by hid
     * description: pass hid or query parameter to get houese list

     * parameters: hid
     * produces: application/json
     * responses: 200, 400
     */
    get: function getHouseByHID(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        const params = req.params;

        if(!Util.ParameterCheck(params,
                ['id']
            )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        MySQL.Houses.findOne({
            where:{
                id: params.id
            }
        }).then(
            houseIns=>{

                Promise.all([
                    MySQL.GeoLocation.findOne({
                        where:{
                            id: houseIns.geoLocation
                        }
                    }),
                    MySQL.HouseType.findAll({
                        where:{
                            houseId: houseIns.id
                        }
                    })
                ]).then(
                    result=>{
                        houseIns.config = houseIns.config || [];
                        houseIns = MySQL.Plain(houseIns);
                        houseIns.location = result[0] || {};
                        houseIns.houseType = result[1];

                        res.send(ErrorCode.ack(ErrorCode.OK, houseIns));
                    },
                    err=>{
                        res.send(ErrorCode.ack(ErrorCode.DATABASEEXEC));
                    }
                );

            }
        );
    },
    /**
     * summary: delete house
     * description: save house information

     * parameters: hid
     * produces: application/json
     * responses: 200, 400, 405, 410
     */
    delete: function deleteHouse(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        const houseId = req.params.id;

        MySQL.Houses.findOne(
            {
                deleteAt: moment().unix(),
                status: Typedef.HouseStatus.DELETE
            },
            {
                where:{
                    id: houseId
                }
            }
        ).then(
            result=>{
                res.send(ErrorCode.ack(ErrorCode.OK));
            },
            err=>{
                log.error(err, houseId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        );
    },
    /**
     * summary: update house
     * description: save house information

     * parameters: hid, body
     * produces: application/json
     * responses: 200, 400
     */
    put: function updateHouse(req, res, next) {
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        const body = req.body;

        if(!Util.ParameterCheck(params,
                ['id']
            )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        const houseId = req.params.id;

        const PutHouses = (putObj, houseType, t)=>{
            return MySQL.Houses.update(
                putObj,
                {
                    where:{
                        id: houseId
                    },
                    transaction: t
                }
            ).then(
                ()=>{
                    if(houseType) {
                        return MySQL.HouseType.upsert(houseType, {transaction: t});
                    }
                }
            );
        };

        MySQL.Houses.findOne({
            where:{
                id: houseId
            },
        }).then(
            houseIns=>{
                if(!houseIns){
                    return res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
                }

                let commonFields = ['code', 'location', 'group', 'building', 'unit'
                    , 'roomNumber', 'roomArea'
                    ,"currentFloor", "roomCountOnFloor", "enabledFloors"
                    , "status" , "desc"
                    , "config"
                ];
                let putObj = _.pick(body, commonFields);


                //update geolocation
                MySQL.Sequelize.transaction(t=>{
                    if(putObj.location && putObj.location.id !== houseIns.id) {
                        return common.UpsertGeoLocation(body.location, t).then(
                            location => {
                                putObj.geoLocation = location[0].id;
                                return PutHouses(putObj, body.houseType, t);
                            }
                        );
                    }
                    else{
                        return PutHouses(putObj, body.houseType, t);
                    }
                }).then(
                    ()=>{
                        res.send(ErrorCode.ack(ErrorCode.OK));
                    }
                ).catch(
                    err=>{
                        log.error(err, body);
                        res.send(ErrorCode.ack(ErrorCode.DATABASEEXEC));
                    }
                );
            }
        );
    }
};
