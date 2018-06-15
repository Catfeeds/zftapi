'use strict'

const {put, get} = require(
  '../../services/v1.0/handlers/projects/:projectId/houses/:houseId/apportionment')
require('include-node')
const {spy, stub} = require('sinon')

describe('HouseApportionment', function() {
  before(() => {
    global.Typedef = Include('/libs/typedef')
    global.ErrorCode = Include('/libs/errorCode')
    global.log = console
  })
  it('should only allow sharing 100%', async function() {
    const req = {
      params: {
        projectId: 100,
      },
      body: [
        {
          value: 99,
        }],
      query: {},
    }
    const sendSpy = spy()
    global.MySQL = {
      Houses: {
        id: 'Houses', findById: async () => ({
          toJSON: () => ({
            houseApportionment: [
              {
                id: 1001,
                roomId: 1,
              },
              {
                id: 1002,
                roomId: 2,
              }],
          }),
        }),
      },

    }

    await put(req, {send: sendSpy}).then(() => {
      sendSpy.should.have.been.called
      const response = sendSpy.getCall(0).args
      response.should.be.eql([
        403, {
          code: 20000032, message: '参数错误', result: {
            error: 'Total share value is not 100%',
          },
        }])
    })
  })

  it('should go manual by default', async function() {
    const req = {
      params: {
        projectId: 100,
        houseId: 999,
      },
      body: [
        {
          roomId: 1,
          value: 90,
        },
        {
          roomId: 2,
          value: 10,
        }],
      query: {},
    }
    const sendSpy = spy()
    const apportionmentUpdateSpy = stub().resolves({})
    const apportionmentDestroySpy = stub().resolves({})

    global.MySQL = {
      Houses: {
        id: 'Houses', findById: async () => ({
          toJSON: () => ({
            rooms: [
              {
                id: 1,
              }, {
                id: 2,
              }],
            houseApportionment: [],
          }),
        }),
      },
      HouseApportionment: {
        id: 'HouseApportionment',
        bulkCreate: apportionmentUpdateSpy,
        destroy: apportionmentDestroySpy,
      },
      Sequelize: {
        transaction: async (f) => f({}),
      },
    }

    await put(req, {send: sendSpy}).then(() => {
      sendSpy.should.have.been.called
      const response = sendSpy.getCall(0).args
      response.should.be.eql([204])
      apportionmentUpdateSpy.should.have.been.called
      apportionmentUpdateSpy.getCall(0).args[0].should.be.eql([
        {
          houseId: 999,
          projectId: 100,
          roomId: 1,
          value: 90,
        }, {
          houseId: 999,
          projectId: 100,
          roomId: 2,
          value: 10,
        }])
      apportionmentDestroySpy.getCall(0).args[0].where.should.be.eql({
        houseId: 999,
      })
    })
  })

  it('should not be tricked from request body', async function() {
    const req = {
      params: {
        projectId: 100,
        houseId: 999,
      },
      body: [
        {
          roomId: 1,
          value: 90,
          projectId: 9999,
          houseId: 8888,
        },
        {
          roomId: 2,
          value: 10,
          projectId: 9991,
          houseId: 8881,
        }],
      query: {},
    }
    const sendSpy = spy()
    const apportionmentUpdateSpy = stub().resolves({})
    const apportionmentDestroySpy = stub().resolves({})

    global.MySQL = {
      Houses: {
        id: 'Houses', findById: async () => ({
          toJSON: () => ({
            rooms: [
              {
                id: 1,
              }, {
                id: 2,
              }],
            houseApportionment: [],
          }),
        }),
      },
      HouseApportionment: {
        id: 'HouseApportionment',
        bulkCreate: apportionmentUpdateSpy,
        destroy: apportionmentDestroySpy,
      },
      Sequelize: {
        transaction: async (f) => f({}),
      },
    }

    await put(req, {send: sendSpy}).then(() => {
      sendSpy.should.have.been.called
      const response = sendSpy.getCall(0).args
      response.should.be.eql([204])
      apportionmentUpdateSpy.should.have.been.called
      apportionmentUpdateSpy.getCall(0).args[0].should.be.eql([
        {
          houseId: 999,
          projectId: 100,
          roomId: 1,
          value: 90,
        }, {
          houseId: 999,
          projectId: 100,
          roomId: 2,
          value: 10,
        }])
      apportionmentDestroySpy.getCall(0).args[0].where.should.be.eql({
        houseId: 999,
      })
    })
  })

  it('should handle no contracted room under current house', async () => {
    const req = {
      params: {
        projectId: 100,
        houseId: 999,
      },
      query: {},
    }
    const sendSpy = spy()

    global.MySQL = {
      Houses: {
        id: 'Houses', findById: async () => null,
      },
      Sequelize: {
        transaction: async (f) => f({}),
      },
    }

    await get(req, {send: sendSpy}).then(() => {
      sendSpy.should.have.been.called
      sendSpy.getCall(0).args[0].should.be.eql([])
    })
  })
  it('should give share values back for given house',
    async () => {
      const req = {
        params: {
          projectId: 100,
          houseId: 999,
        },
        query: {},
      }
      const sendSpy = spy()

      global.MySQL = {
        Houses: {
          id: 'Houses',
          findById: async () => ({
            toJSON: () => ({
              devices: [
                {
                  deviceId: 3322,
                }],
              rooms: [
                {
                  id: 1,
                },
                {
                  id: 2,
                }],
              houseApportionments: [
                {
                  roomId: 1,
                  value: 90,
                },
                {
                  roomId: 2,
                  value: 10,
                }],
            }),
          }),
        },
        Sequelize: {
          transaction: async (f) => f({}),
        },
      }

      await get(req, {send: sendSpy}).then(() => {
        sendSpy.should.have.been.called
        sendSpy.getCall(0).args[0].should.be.eql([
          {
            houseId: 999,
            projectId: 100,
            roomId: 1,
            value: 90,
          },
          {
            houseId: 999,
            projectId: 100,
            roomId: 2,
            value: 10,
          },
        ])
      })
    })
  it('should handle no public device installed at current house',
    async () => {
      const req = {
        params: {
          projectId: 100,
          houseId: 999,
        },
        query: {},
      }
      const sendSpy = spy()

      global.MySQL = {
        Houses: {
          id: 'Houses',
          findById: async () => ({
            toJSON: () => ({
              devices: [],
              rooms: [
                {
                  id: 1,
                },
                {
                  id: 2,
                }],
              houseApportionments: [
                {
                  roomId: 1,
                  value: 90,
                },
                {
                  roomId: 2,
                  value: 10,
                }],
            }),
          }),
        },
        Sequelize: {
          transaction: async (f) => f({}),
        },
      }

      await get(req, {send: sendSpy}).then(() => {
        sendSpy.should.have.been.called
        sendSpy.getCall(0).args[0].should.be.eql([])
      })
    })
})