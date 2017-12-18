'use strict';
const _ = require('lodash');

function BuildDivisionTree(divisions, inDivision)
{
    //
    let tree = {};
    divisions.map(division=>{
        const divisionId = division.id.toString();
        const parentDivision = Util.ParentDivisionId(divisionId);
        if(divisionId === parentDivision){
            tree[divisionId] = {
                divisionId: divisionId,
                name: division.title,
                divisions:{}
            };
        }
        else{
            let divisionInfo = {
                divisionId: divisionId,
                name: division.title
            };
            if(inDivision[divisionId]){
                divisionInfo.communities = inDivision[divisionId];
            }
            tree[parentDivision].divisions[divisionId] = divisionInfo;
        }
    });

    return tree;
}

/**
 * Operations on /communities/:communityId
 */
module.exports = {
	get: function getCommunity(req, res, next) {

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


            // let sql;
            const replacements = {
                houseFormat: houseFormat,
                projectId: projectId
            };
            //
            // switch(houseFormat){
            //     case Typedef.HouseFormat.ENTIRE:
            //         sql = `select distinct(geoLocation) from ${MySQL.Entire.name} where projectId=:projectId `;
            //         break;
            //     case Typedef.HouseFormat.SOLE:
            //     case Typedef.HouseFormat.SHARE:
            //         sql = `select distinct(geoLocation) from ${MySQL.Soles.name} where projectId=:projectId and houseFormat=:houseFormat `;
            //         break;
            // }



            try {
                const sql = `select distinct(bu.locationId),bu.id as buildingId from ${MySQL.Houses.name} as h 
                    inner join buildings as bu on h.buildingId=bu.id 
                     where h.houseFormat=:houseFormat and h.projectId=:projectId`;
                const locations = await MySQL.Exec(sql, replacements);
                let geoLocationIds = [];
                let locationBuilding = {};
                locations.map(r=>{
                    geoLocationIds.push(r.locationId);
                    locationBuilding[r.locationId] = r.buildingId;
                });

                if(!locations.length){
                    return res.send([]);
                }

                const geoLocations = await MySQL.GeoLocation.findAll({
                    where: {
                        id: {$in: geoLocationIds}
                    },
                    attributes: ['id', 'divisionId', 'name']
                });
                let divisionIds = [];
                let inDivision = {};
                geoLocations.map(loc => {
                    const parentDivision = Util.ParentDivisionId(loc.divisionId.toString());
                    divisionIds.push(parentDivision);
                    divisionIds.push(loc.divisionId);
                    if (!inDivision[loc.divisionId]) {
                        inDivision[loc.divisionId] = [];
                    }
                    inDivision[loc.divisionId].push({
                        geoLocationId: loc.id,
                        buildingId: locationBuilding[loc.id],
                        name: loc.name
                    });
                });
                divisionIds = _.uniq(divisionIds);

                const divisions = await MySQL.Divisions.findAll({
                    where: {
                        id: {$in: divisionIds}
                    },
                    attributes: ['id', 'title']
                });

                res.send( BuildDivisionTree(divisions, inDivision) );
            }
            catch(e){
                log.error(e, projectId, houseFormat);
            }
        })();
    }
};
