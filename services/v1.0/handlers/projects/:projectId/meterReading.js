'use strict';
/**
 * Operations on /houses
 */
const _ = require('lodash');


module.exports = {
    get: (req, res)=>{
        /**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
        (async()=>{
            const query = req.query;
            // const params = req.params;

            const projectId = req.params.projectId;
            // const deviceType = req.query.deviceType;

            // const timeFrom = req.query.timeFrom;
            // const timeTo = req.query.timeTo;

            const houseFormat = req.query.houseFormat;

            const districtLocation = ()=>{
                if(query.locationId){
                    // geoLocationIds = [query.locationId];
                    return {'$building.location.id$': query.locationId};
                }
                else if(query.districtId){
                    if(Util.IsParentDivision(query.districtId)){
                        return {
                            '$building.location.divisionId': {$regexp: Util.ParentDivision(query.districtId)}
                        };
                    }
                    else{
                        return {
                            '$building.location.divisionId': query.districtId
                        };
                    }
                }
            };

            MySQL.Houses.findAll({
                where:{
                    projectId: projectId,
                    houseFormat: houseFormat,
                },
                include:[
                    {
                        model: MySQL.Rooms
                        , as: 'rooms'
                        , required: true
                    },
                    {
                        model: MySQL.Building, as: 'building'
                        , include:[{
                            model: MySQL.GeoLocation, as: 'location',
                        }]
                        , required: true
                        , attributes: ['group', 'building', 'unit'],
                    }
                ]
            }).then();
        })();
    },
};
