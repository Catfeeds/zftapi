'use strict'
const fp = require('lodash/fp')

function BuildDivisionTree(districts, inDivision)
{
  //
  let tree = {}
  districts.map(district=>{
    const districtId = district.id.toString()
    const parentDivision = Util.ParentDivisionId(districtId)
    if(districtId === parentDivision){
      tree[districtId] = {
        districtId: districtId,
        name: district.title,
        districts:{}
      }
    }
    else{
      let districtInfo = {
        districtId: districtId,
        name: district.title
      }
      if(inDivision[districtId]){
        districtInfo.communities = inDivision[districtId]
      }
      tree[parentDivision].districts[districtId] = districtInfo
    }
  })

  return tree
}

/**
 * Operations on /communities/:communityId
 */
module.exports = {
  get: function getCommunity(req, res) {

    (async()=>{
      const param = req.params
      const query = req.query

      if(!Util.ParameterCheck(query,
        ['houseFormat']
      )){
        return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED))
      }
      const houseFormat = query.houseFormat
      const projectId = param.projectId


      // let sql;
      const replacements = {
        houseFormat: houseFormat,
        projectId: projectId
      }

      try {
        const sql = `select distinct(bu.locationId),bu.id as buildingId from ${MySQL.Houses.name} as h 
                    inner join buildings as bu on h.buildingId=bu.id 
                     where h.deleteAt=0 and  bu.deleteAt=0 and h.houseFormat=:houseFormat and h.projectId=:projectId`
        const locations = await MySQL.Exec(sql, replacements)
        let geoLocationIds = []
        let locationBuilding = {}
        locations.map(r=>{
          geoLocationIds.push(r.locationId)
          locationBuilding[r.locationId] = r.buildingId
        })

        if(!locations.length){
          return res.send([])
        }

        const geoLocations = await MySQL.GeoLocation.findAll({
          where: {
            id: {$in: geoLocationIds}
          },
          attributes: ['id', 'divisionId', 'name']
        })
        let districtIds = []
        let inDivision = {}
        geoLocations.map(loc => {
          const districtId = loc.divisionId

          const parentDivision = Util.ParentDivisionId(districtId.toString())
          districtIds.push(parentDivision)
          districtIds.push(districtId)
          if (!inDivision[districtId]) {
            inDivision[districtId] = []
          }
          inDivision[districtId].push({
            geoLocationId: loc.id,
            buildingId: locationBuilding[loc.id],
            name: loc.name
          })
        })
        districtIds = fp.uniq(districtIds)

        const districts = await MySQL.Divisions.findAll({
          where: {
            id: {$in: districtIds}
          },
          attributes: ['id', 'title']
        })

        res.send( BuildDivisionTree(districts, inDivision) )
      }
      catch(e){
        log.error(e, projectId, houseFormat)
      }
    })()
  }
}