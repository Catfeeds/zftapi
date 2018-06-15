'use strict'

const fp = require('lodash/fp')
const moment = require('moment')

module.exports = {
  put: async(req, res) => {

    const projectId = req.params.projectId
    const type = req.params.type

    const body = req.body

    if(!Util.ParameterCheck(body, ['category', 'price'] )){
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, {error: 'missing query params houseFormat'}))
    }

    const getHouseIds = async()=>{

      const where = fp.assign(
        {
          projectId: projectId,
          status: {$ne: Typedef.HouseStatus.DELETED},
        },
        body.houseIds ? {id:{$in: body.houseIds}} : {}
      )

      const houses = await MySQL.Houses.findAll({
        where: where,
        attributes: ['id']
      })

      return fp.map(house=>{return house.id})(houses)
    }


    let t
    try {
      const now = moment().unix()
      const houseIds = await getHouseIds()
      if(!houseIds.length){
        return res.send(404, ErrorCode.ack(ErrorCode.HOUSEEXISTS))
      }
      const devicePrices = await MySQL.HouseDevicePrice.findAll({
        where: {
          houseId: {$in: houseIds},
          projectId: projectId,
          type: type,
          category: body.category,
          endDate: 0
        }
      })

      //
      const updateIds = fp.compact( fp.map(price => {
        if( price.startDate === now ){
          return price.id
        }
        return null
      })(devicePrices) )
      const updateHouseIds = fp.compact( fp.map(price => {
        if(price.startDate === now){
          return price.houseId
        }
        return  null
      })(devicePrices) )


      const createHouseId = fp.difference(houseIds, updateHouseIds)

      const createPrices = fp.map(id => {
        return {
          projectId: projectId,
          houseId: id,
          type: type,
          category: body.category,
          price: body.price,
          startDate: now
        }
      })(createHouseId)

      t = await MySQL.Sequelize.transaction({autocommit: false})

      const endDate = moment().subtract(1, 'days').unix()
      await MySQL.HouseDevicePrice.update(
        {
          endDate: endDate
        },
        {
          where: {
            category: body.category,
            projectId: projectId,
            type: type,
            houseId: {$in: createHouseId},
            endDate: 0
          },
          transaction: t
        }
      )

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
      )

      await MySQL.HouseDevicePrice.bulkCreate(createPrices, {transaction: t})

      await t.commit()

      res.send(204)
    }
    catch(e){
      t.rollback()
      log.error(e, projectId, type, body)
      res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC))
    }
  }
}
