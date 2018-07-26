'use strict'
const fp = require('lodash/fp')
const common = Include('/services/v1.0/common')
const moment = require('moment')
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
  get: (req, res) => {
    /**
     * Get the data for response 200
     * For response `default` status 200 is used.
     */
    (async () => {
      const params = req.params

      const id = params.houseId
      const projectId = params.projectId

      const houseIns = await MySQL.Houses.findOne({
        where: {
          id: id,
          projectId: projectId,
        },
        subQuery: false,
        include: [
          {
            model: MySQL.Building, as: 'building'
            , include: [
              {
                model: MySQL.GeoLocation, as: 'location',
              }]
            , attributes: ['group', 'building', 'unit'],
          },
          {
            model: MySQL.Layouts,
            as: 'layouts',
            attributes: [
              'id',
              'name',
              'bedRoom',
              'livingRoom',
              'bathRoom',
              'orientation',
              'roomArea',
              'remark'],
          },
          await common.includeRoom(),
          {
            model: MySQL.HouseDevicePrice,
            as: 'prices',
            required: false,
            where: {
              endDate: 0,
            },
            attributes: ['type', 'price'],
          },
          common.includeHouseDevices(true),
        ],
      })
      if (!houseIns) {
        return res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH))
      }

      const house = houseIns.toJSON()

      res.send({
        code: house.code,
        location: house.building.location,
        houseKeeper: house.houseKeeper,
        group: house.building.group,
        building: house.building.building,
        unit: house.building.unit,
        price: house.prices,
        roomNumber: house.roomNumber,
        currentFloor: house.currentFloor,
        totalFloor: house.building.totalFloor,
        layout: house.layouts,
        config: house.config,
        rooms: common.translateRooms(house.layouts)(house.rooms),
        devices: common.translateDevices(house.devices),
      })
    })()
  },
  /**
   * summary: delete house
   * description: save house information

   * parameters: hid
   * produces: application/json
   * responses: 200, 400, 405, 410
   */
  delete: async (req, res) => {
    const houseId = req.params.houseId
    const projectId = req.params.projectId

    const isExists = await MySQL.Houses.count({
      where: {
        id: houseId,
        deleteAt: 0,
        projectId,
        status: {
          $or: [Typedef.HouseStatus.OPEN, Typedef.HouseStatus.CLOSED]
        },
      },
    })
    if (!isExists) {
      return res.send(412, ErrorCode.ack(ErrorCode.STATUSUNMATCH,
        {message: `please check the status of house ${houseId}.`}))
    }

    const now = moment().unix()
    const rooms = await MySQL.Rooms.findAll({
      where: {
        houseId: houseId,
      },
      include: [
        {
          model: MySQL.Contracts,
          as: 'contracts',
          where: {
            to: {
              $or: [
                {$eq: 0},
                {$gte: now},
              ],
            },
          },
          required: false,
        },
      ],
    })

    const isRoomInUse = fp.compact(fp.map(room => {
      return common.roomLeasingStatus(room.contracts) !==
      Typedef.OperationStatus.IDLE ? room.id : null
    })(rooms))

    if (isRoomInUse.length) {
      return res.send(400, ErrorCode.ack(ErrorCode.CONTRACTWORKING))
    }

    let t
    try {
      t = await MySQL.Sequelize.transaction({autocommit: false})

      const now = moment()
      await MySQL.Houses.update(
        {
          deleteAt: now.unix(),
          status: Typedef.OperationStatus.DELETED,
        },
        {
          where: {
            id: houseId,
            projectId: projectId,
          },
          transaction: t,
        },
      )
      await MySQL.Layouts.update(
        {
          deleteAt: now.unix(),
        },
        {
          where: {
            sourceId: houseId,
          },
          transaction: t,
        },
      )
      await MySQL.Rooms.destroy(
        {
          where: {
            houseId: houseId,
          },
          transaction: t,
        },
      )
      await MySQL.HouseDevices.destroy(
        {
          where: {
            sourceId: houseId,
            endDate: 0,
          },
          transaction: t,
        },
      )

      await t.commit()
      res.send(204)
    }
    catch (e) {
      log.error(e, houseId)
      await t.rollback()
      res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC))
    }
  },
  /**
   * summary: update house
   * description: save house information

   * parameters: hid, body
   * produces: application/json
   * responses: 200, 400
   */
  put: function updateHouse(req, res) {
    /**
     * Get the data for response 200
     * For response `default` status 200 is used.
     */
    (async () => {
      const body = req.body
      const params = req.params

      const projectId = params.projectId
      const houseId = params.houseId

      const houseIns = await MySQL.Houses.findOne({
        where: {
          id: houseId,
          projectId: projectId,
        },
      })

      if (!houseIns) {
        return res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH))
      }

      const putBody = fp.pick(body
        , [
          'location', 'code', 'group', 'building', 'unit',
          'roomNumber', 'totalFloor', 'currentFloor',
          'config', 'houseKeeper', 'layout'],
      )

      try {
        const t = await MySQL.Sequelize.transaction()

        if (body.location) {
          const newLocation = await common.AsyncUpsertGeoLocation(body.location,
            t)
          body.location = MySQL.Plain(newLocation[0])
        }

        if (!fp.isEmpty(putBody)) {
          await MySQL.Houses.update(
            putBody,
            {
              where: {
                id: houseId,
                projectId: projectId,
              },
              transaction: t,
            },
          )

          await MySQL.Building.update(
            putBody,
            {
              where: {
                id: houseIns.buildingId,
                projectId: projectId,
              },
              transaction: t,
            },
          )

          await MySQL.Layouts.update(
            putBody.layout,
            {
              where: {
                id: body.layout.id,
                sourceId: houseId,
              },
              transaction: t,
            },
          )
        }

        await t.commit()
        res.send(204)
      }
      catch (e) {
        log.error(ErrorCode.ack(e.message), params, body)
        res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC))
      }
    })()
  },
}
