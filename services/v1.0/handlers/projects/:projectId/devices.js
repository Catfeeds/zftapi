'use strict'

const fp = require('lodash/fp')
const moment = require('moment')
const common = Include('/services/v1.0/common')

module.exports = {
  get: async (req, res) => {
    /**
         * mode=FREE
         */
    const send = res.send.bind(res)
    const projectId = req.params.projectId
    const query = req.query

    const power = query.switch || 'ALL'
    const service = query.status || 'ALL'
    const q = query.q

    if (!Util.ParameterCheck(query,
      ['mode'],
    )) {
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED))
    }
    const mode = query.mode
    const pagingInfo = Util.PagingInfo(query.index, query.size, true)

    const getQueryPower = () => {
      return power === 'ALL' ? {} : {
        status: {$regexp: power === 'OFF' ? 'EMC_OFF' : 'EMC_ON'},
      }
    }
    const getQueryStatus = () => {
      return service === 'ALL' ? {} : {
        updatedAt: service === 'OFFLINE' ?
          {
            $lt: MySQL.Sequelize.literal(
              `FROM_UNIXTIMESTAMP(${nowTime}-freq)`),
          } :
          {
            $gt: MySQL.Sequelize.literal(
              `FROM_UNIXTIMESTAMP(${nowTime}-freq)`),
          },
      }
    }
    const getDeviceStatus = (device, nowTime) => {
      const updatedAt = moment(device.updatedAt)
      const service = updatedAt < nowTime - device.freq ?
        'EMC_OFFLINE' :
        'EMC_ONLINE'
      const power = fp.getOr('EMC_OFF')('status.switch')(device)

      return {
        service: service,
        switch: power,
      }
    }

    if (mode === 'BIND') {
      const houses = await MySQL.Houses.findAll({
        where: fp.extendAll([
          {projectId: projectId}
          , common.districtLocation(query) || {}
          , q ? {
            $or: [
              {'$building.location.name$': {$regexp: query.q}},
              {roomNumber: {$regexp: query.q}},
              {code: {$regexp: query.q}},
              {'$rooms.contracts.user.name$': {$regexp: query.q}},
              {'$rooms.devices.deviceId$': {$regexp: query.q}},
              {'$devices.deviceId$': {$regexp: query.q}},
              {'$devices.memo$': {$regexp: query.q}},
            ],
          } : {},
        ]),
        attributes: ['id', 'roomNumber'],
        include: [
          {
            model: MySQL.Building
            , as: 'building'
            , required: true
            , attributes: ['building', 'unit']
            , include: [
              {
                model: MySQL.GeoLocation
                , as: 'location'
                , attributes: ['name']
                , required: true,
              }],
          }
          , {
            model: MySQL.Rooms
            , as: 'rooms'
            , required: true
            , attributes: ['id']
            , include: [
              {
                model: MySQL.Contracts
                , as: 'contracts'
                , attributes: ['userId']
                , include: [
                  {
                    model: MySQL.Users
                    , as: 'user'
                    , attributes: ['name'],
                  }],
              }
              , {
                model: MySQL.HouseDevices,
                as: 'devices',
                required: true,
                where: {
                  endDate: 0,
                },
              },
            ],
          }
          , {
            model: MySQL.HouseDevices,
            as: 'devices',
            required: false,
            where: {
              endDate: 0,
              public: true,
            },
          },
        ],
      })

      const sourceIds = fp.flattenDeep(fp.map(house => {
        return fp.map(room => {
          return room.id
        })(house.rooms)
      })(houses))

      const houseIdMapping = fp.fromPairs(fp.map(house => {
        return [
          house.id, {
            id: house.id,
            building: house.building,
            contract: null,
          }]
      })(houses))

      const roomIdMapping = fp.extendAll(fp.map(house => {
        return fp.fromPairs(fp.map(room => {
          return [
            room.id, {
              id: room.id,
              building: house.building,
              roomNumber: house.roomNumber,
              contract: fp.getOr(null)('contracts[0]')(room),
            }]
        })(house.rooms))
      })(houses))

      const sourceIdMapping = fp.extendAll([
        houseIdMapping,
        roomIdMapping,
      ])

      const devices = await MySQL.Devices.findAndCountAll({
        where: fp.extendAll([
          getQueryPower()
          , getQueryStatus()
          , {projectId},
        ])
        , include: [
          {
            model: MySQL.DevicesChannels,
            as: 'channels',
            required: true,
          },
          {
            model: MySQL.HouseDevices,
            as: 'houseRelation',
            required: true,
            where: {
              endDate: 0
              , sourceId: {$in: sourceIds},
            },
          },
        ]
        , offset: pagingInfo.skip
        , limit: pagingInfo.size,
      })

      const nowTime = moment().unix()
      const rows = fp.map(device => {
        const roomIns = sourceIdMapping[fp.getOr(0)(
          'houseRelation.sourceId')(device)]

        return {
          deviceId: device.deviceId
          , memo: device.memo
          , status: getDeviceStatus(device, nowTime)
          , scale: fp.getOr(0)('channels[0].scale')(device)
          , updatedAt: moment(device.updatedAt).unix()
          , building: fp.getOr({})('building')(roomIns)
          , roomNumber: fp.getOr('')('roomNumber')(roomIns)
          , contract: fp.getOr({})('contract')(roomIns),
        }
      })(devices.rows)

      res.send({
        paging: {
          count: devices.count,
          index: pagingInfo.index,
          size: pagingInfo.size,
        },
        data: rows,
      })
    }
    else if (mode === 'FREE') {
      const houseDevices = await MySQL.HouseDevices.findAll(
        {
          where: {
            projectId: projectId,
            endDate: 0,
          },
          attributes: [
            [
              MySQL.Sequelize.fn('DISTINCT',
                MySQL.Sequelize.col('deviceId')), 'deviceId'],
          ],
        })
      const deviceIds = fp.map(device => {
        return device.deviceId
      })(houseDevices)

      const nowTime = moment().unix()
      const where = fp.extendAll(
        [
          {
            projectId: projectId,
            deviceId: {
              $notIn: deviceIds,
            },
          }
          , getQueryPower()
          , getQueryStatus(),
          q ? {
            $or: [
              {'$devices.deviceId$': {$regexp: q}},
              {'$devices.memo$': {$regexp: q}},
            ],
          } : {},
        ],
      )
      const devices = await MySQL.Devices.findAndCountAll(
        fp.assign(
          {
            where: where,
            include: [
              {
                model: MySQL.DevicesChannels,
                as: 'channels',
              },
            ],
          }
          , pagingInfo ?
            {
              offset: pagingInfo.skip,
              limit: pagingInfo.size,
            } :
            {},
        ),
      )

      const returnDevices = fp.map(device => {

        const updatedAt = moment(device.updatedAt)

        return {
          deviceId: device.deviceId
          , memo: device.memo
          , status: getDeviceStatus(device, nowTime)
          , scale: fp.getOr(0)('channels[0].scale')(device)
          , updatedAt: updatedAt.unix(),
        }
      })(devices.rows)

      res.send({
        paging: {
          count: devices.count,
          index: pagingInfo.index,
          size: pagingInfo.size,
        },
        data: returnDevices,
      })
    } else {
      MySQL.Devices.findAll({
        where:{
          projectId: projectId,
        }
      }).then(send)
    }
  },
  //TODO: Why delete method is on this level?
  delete: async (req, res) => {

    const projectId = req.params.projectId

    const deviceIds = req.body.deviceIds

    MySQL.HouseDevices.count({
      where: {
        projectId: projectId,
        deviceId: {$in: deviceIds},
        endDate: 0,
      },
    }).then(
      count => {
        if (count) {
          return res.send(ErrorCode.ack(ErrorCode.DEVICEINBIND))
        }

        MySQL.Devices.destroy({
          where: {
            projectId: projectId,
            deviceId: {$in: deviceIds},
          },
        }).then(
          () => {
            res.send(204)
          },
          err => {
            log.error(err, projectId, deviceIds)
            res.send(ErrorCode.ack(ErrorCode.DATABASEEXEC))
          },
        )
      },
      err => {
        log.error(err, projectId, deviceIds)
        res.send(ErrorCode.ack(ErrorCode.DATABASEEXEC))
      },
    )
  },
  post: async (req, res) => {
    const {projectId} = req.params

    const illFormatReport = illegalFormatIds(req.body)
    if(!fp.isEmpty(illFormatReport)) {
      return res.send(422, ErrorCode.ack(ErrorCode.DEVICEIDERROR, {message: `incorrect id format: ${illFormatReport}`}))
    }

    const duplicatedReport = duplicatedIds(req.body)
    if(!fp.isEmpty(duplicatedReport)) {
      return res.send(422, ErrorCode.ack(ErrorCode.DEVICEIDERROR, {message: `duplicated id format: ${duplicatedReport}`}))
    }

    const duplicatedInOtherProjectReport = await duplicatedWithOtherProjects(MySQL)(projectId, fp.map('deviceId')(req.body))
    if(!fp.isEmpty(duplicatedInOtherProjectReport)) {
      return res.send(422, ErrorCode.ack(ErrorCode.DEVICEIDERROR, {message: `duplicated id in other project: ${duplicatedInOtherProjectReport}`}))
    }

    const type = 'ELECTRICITY'
    const freq = 600
    const driver = 'YTL/Electric/YTL-BUSvA.1.02.js'
    const status = {switch:'EMC_ON'}
    const allDevices = fp.map(fp.defaults({projectId, type, freq, driver, status}))(req.body)
    const CHANNEL_TEMP = channelTemplate(moment().unix())
    const allChannels = fp.map(fp.pipe(
      fp.pick(fp.keys(CHANNEL_TEMP).concat(['deviceId'])),
      fp.defaults(CHANNEL_TEMP)
    ))(req.body)
    return MySQL.Sequelize.transaction(t => Promise.all([
      MySQL.Devices.bulkCreate(allDevices, {
        updateOnDuplicate: true,
        transaction: t,
      },
      ), MySQL.DevicesChannels.bulkCreate(allChannels, {
        updateOnDuplicate: true,
        transaction: t,
      },
      )]).then(
      () => res.send(201),
    ).catch(
      err => {
        log.error('error in creating devices: ', err, projectId, body)
        re.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC))
      },
    ))
  },
}

const illegalFormatIds = fp.pipe(
  fp.reject(s => fp.getOr('')('deviceId')(s).match(/^\w+\d{12}$/)),
  fp.map('deviceId'))

const duplicatedIds = fp.pipe(fp.groupBy('deviceId'),
  fp.pickBy(l => l.length > 1), fp.keys)

const duplicatedWithOtherProjects = MySQL => async (
  projectId, ids) => MySQL.Devices.findAll(
  {
    where: {
      deviceId: {$in: ids},
      projectId: {$ne: projectId},
    }, attributes: ['deviceId'],
  }).then(fp.map(fp.pipe(j => j.toJSON(), fp.get('deviceId'))))

const channelTemplate = updatedAt => ({
  channelId: '11',
  comi: '1.000000',
  scale: 0,
  updatedAt,
})
