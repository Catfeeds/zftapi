'use strict'

const moment = require('moment')
const {fn} = require('moment')
const {spy} = require('sinon')
const sinon = require('sinon')
const {get} = require(
  '../../../services/v1.0/handlers/projects/:projectId/devices/reading')

const sandbox = sinon.sandbox.create()

describe('Reading meters', function() {
  before(() => {
    global.Typedef = Include('/libs/typedef')
    sandbox.stub(fn, 'unix')
    fn.unix.returns(20189999)
  })

  after(() => {
    sandbox.restore()
  })

  it('should return rooms with detail', async function() {
    const houses = [
      {
        toJSON: () => ({
          ...houseFields(),
          rooms: standardRooms(),
        }),
      }]
    const heartbeats = [standardHeartbeat()]
    global.MySQL = stubSequelizeModel(houses, heartbeats)
    const resSpy = spy()

    await get(standardRequest(), {send: resSpy}).then(() => {
      resSpy.should.have.been.called
      resSpy.getCall(0).args[0].data.should.be.eql([
        {
          ...expectedFields,
          details: [
            {
              amount: 1000 * 100,
              price: 1000,
              device: {
                deviceId: 123,
              },
              endDate: 20189999,
              startDate: 20189999,
              endScale: '200.0000',
              startScale: '100.0000',
              usage: '100.0000',
              userId: 222,
              userName: 'username',
            },
          ],
        }])
    })
  })
  it('should ignore duplicated devices in one room', async () => {
    const houses = [
      {
        toJSON: () => ({
          ...houseFields(),
          rooms: standardRooms(),
        }),
      }]
    const heartbeats = [standardHeartbeat()]
    global.MySQL = stubSequelizeModel(houses, heartbeats)
    const resSpy = spy()

    await get(standardRequest(), {send: resSpy}).then(() => {
      resSpy.should.have.been.called
      resSpy.getCall(0).args[0].data.should.be.eql([
        {
          ...expectedFields,
          details: [
            {
              amount: 1000 * 100,
              price: 1000,
              device: {
                deviceId: 123,
              },
              endDate: timeAlign(200000),
              startDate: timeAlign(100000),
              endScale: '200.0000',
              startScale: '100.0000',
              usage: '100.0000',
              userId: 222,
              userName: 'username',
            },
          ],
        }])
    })
  })
  it('should return house and its rooms with detail', async function() {
    const houses = [
      {
        toJSON: () => ({
          id: 199,
          ...houseFields(),
          prices: [
            {
              price: 2000,
            },
          ],
          devices: [
            {
              deviceId: 234,
            },
          ],
        }),
      }]
    const heartbeats = [
      standardHeartbeat(),
      standardHeartbeat({
        deviceId: 234,
        startScale: 900,
        endScale: 2000,
      })]
    global.MySQL = stubSequelizeModel(houses, heartbeats)
    const resSpy = spy()

    await get(standardRequest({houseId: 199}), {send: resSpy}).then(() => {
      resSpy.should.have.been.called
      resSpy.getCall(0).args[0].data.should.be.eql([
        {
          houseId: 199,
          location: 'location',
          roomNumber: 'roomNumber',
          unit: 'unit',
          building: 'building',
          details: [
            {
              amount: 2000 * 1100,
              price: 2000,
              device: {
                deviceId: 234,
              },
              endScale: '2000.0000',
              startScale: '900.0000',
              endDate: timeAlign(200000),
              startDate: timeAlign(100000),
              usage: '1100.0000',
            },
          ],
        }])
    })
  })

  it('should return scale no more than 4 fixed-point notation',
    async function() {
      const houses = [
        {
          toJSON: () => ({
            ...houseFields(),
            rooms: standardRooms(),
          }),
        }]
      const heartbeats = [
        standardHeartbeat({
          startScale: 1.0000000000001,
          endScale: 3,
          startDate: 100000,
          endDate: 150000,
        })]
      global.MySQL = stubSequelizeModel(houses, heartbeats)
      const resSpy = spy()

      await get(standardRequest(), {send: resSpy}).then(() => {
        resSpy.should.have.been.called
        resSpy.getCall(0).args[0].data.should.be.eql([
          {
            ...expectedFields,
            details: [
              {
                amount: 2 * 1000,
                price: 1000,
                device: {
                  deviceId: 123,
                },
                endDate: timeAlign(200000),
                startDate: timeAlign(100000),
                endScale: '3.0000',
                startScale: '1.0000',
                usage: '2.0000',
                userId: 222,
                userName: 'username',
              },
            ],
          }])
      })
    })

})

const timeAlign = time => moment.unix(time).
  startOf('days').
  unix()

const stubSequelizeModel = (houses, heartbeats) => ({
  Houses: {
    async findAll() {
      return houses
    },
  },
  DeviceHeartbeats: {
    async findAll() {
      return heartbeats
    },
  },
  Sequelize: {
    fn: () => {
    },
    col: () => {
    },
  },
})
const defaultPrices = [
  {
    price: 1000,
  },
]
const houseFields = (prices = defaultPrices) => ({
  building: {
    building: 'building',
    unit: 'unit',
    location: 'location',
  },
  roomNumber: 'roomNumber',
  prices,
})

const expectedFields = {
  location: 'location',
  roomId: 'roomId',
  roomName: 'roomName',
  roomNumber: 'roomNumber',
  unit: 'unit',
  building: 'building',
}

const standardRequest = (extra = {}) => ({
  params: {
    projectId: 100,
  },
  query: {
    houseFormat: 'SHARE',
    startDate: 100000,
    endDate: 200000,
    ...extra,
  },

})

const standardRooms = () => [
  {
    id: 'roomId',
    name: 'roomName',
    contracts: [
      {
        userId: 222,
        user: {
          name: 'username',
        },
        from: 200000,
        to: 300000,
      }],
    devices: [
      {
        deviceId: 123,
      },
    ],
  },
]

const standardHeartbeat = (extra = {}) => ({
  toJSON: () => ({
    deviceId: 123,
    startScale: 100,
    endScale: 200,
    startDate: 100,
    endDate: 200,
    ...extra,
  }),
})