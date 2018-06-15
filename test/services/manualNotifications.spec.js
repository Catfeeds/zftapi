'use strict'

const {post} = require(
  '../../services/v1.0/handlers/projects/:projectId/manualNotifications')
const {spy} = require('sinon')

describe('Manual notification', function() {
  it('should send out notification', async function() {
    const req = {
      isAuthenticated: () => true,
      user: {
        level: 'ADMIN',
      },
      params: {
        projectId: 100,
      },
      body: {
        users: [321],
      },

    }
    global.MySQL = {
      CashAccount: {
        findAll: async () => [
          {
            toJSON: () => ({
              id: 123,
              users: 321,
              balance: -100,
            }),
          }],
      },
      Users: {
        findById: async () => ({
          toJSON: () => ({}),
        }),
      },
    }
    const resSpy = spy()

    await post(req, {send: resSpy}).then(() => {
      resSpy.should.have.been.called
      resSpy.getCall(0).args[0].should.be.eql(ErrorCode.ack(ErrorCode.OK))
    })
  })
  it('should not allow normal user send out notifications', async function() {
    const req = {
      isAuthenticated: () => true,
      user: {
        level: 'USER',
      },
      params: {
        projectId: 100,
      },
      body: {
        users: [321],
      },

    }
    global.MySQL = {
      CashAccount: {
        findAll: async () => [
          {
            toJSON: () => ({
              id: 123,
              users: 321,
              balance: -100,
            }),
          }],
      },
      Users: {
        findById: async () => ({
          toJSON: () => ({}),
        }),
      },
    }
    const resSpy = spy()

    await post(req, {send: resSpy}).then(() => {
      resSpy.should.have.been.called
      resSpy.getCall(0).args[0].should.be.eql(403)
    })
  })
})