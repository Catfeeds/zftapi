'use strict';
const _ = require('lodash');

/**
 * Operations on /communities/:communityId
 */
module.exports = {
    get: function getCommunity(req, res) {

        (async()=>{
            const param = req.params;
            const query = req.query;

            if(!Util.ParameterCheck(query,
                ['houseFormat']
            )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }
            const houseFormat = query.houseFormat;
            const projectId = param.projectId;
            const getRootDistricts = (districtCode)=>{
                const parentDistrictCode = Util.ParentDistrict(districtCode);
                if(parentDistrictCode === districtCode){
                    return districtCode;
                }
                return getRootDistricts(parentDistrictCode);
            };
            const districtsCode = query.districtsCode ? Util.TopDistrict(query.districtsCode.toString()) : null;

            // let sql;
            const replacements = _.assign({
                houseFormat: houseFormat,
                projectId: projectId
            }, districtsCode ? {districtsCode: districtsCode} : {});

            try {
                const sql = `select distinct(bu.locationId),bu.id as buildingId,l.divisionId,l.name from ${MySQL.Houses.name} as h
                    inner join buildings as bu on h.buildingId=bu.id
                    inner join location as l on bu.locationId=l.id
                     where h.houseFormat=:houseFormat and h.projectId=:projectId 
                     ${districtsCode ? ` and l.divisionId LIKE '${districtsCode}%' ` : ''}
                     `;
                const locations = await MySQL.Exec(sql, replacements);

                if(_.includes([Typedef.HouseFormat.SOLE, Typedef.HouseFormat.SHARE], houseFormat)){
                    let locationMapping = {};
                    locations.map(loc => {
                        locationMapping[loc.locationId] = {
                            locationId: loc.locationId,
                            name: loc.name
                        };
                    });

                    res.send(_.toArray(locationMapping));
                }
                else{
                    let buildingMapping = {};
                    locations.map(loc => {
                        buildingMapping[loc.buildingId] = {
                            buildingId: loc.buildingid,
                            locationId: loc.locationId,
                            name: loc.name
                        };
                    });

                    res.send(_.toArray(buildingMapping));
                }

            }
            catch(e){
                log.error(e, projectId, houseFormat);
            }
        })();
    }
};
