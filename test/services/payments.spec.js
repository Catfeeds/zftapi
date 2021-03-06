'use strict'

const fp = require('lodash/fp')
require('include-node')
const {spy, stub} = require('sinon')
const {post} = require(
  '../../services/v1.0/handlers/projects/:projectId/bills/:billId/payments')

const notificationStub = {
  Users: {
    async findById() {
      return {toJSON: () => ({auth: {}})}
    },
  },
  UserNotifications: {
    async create() {
      return {}
    }
  },
}
describe('Payment', function() {
  before(() => {
    global.Typedef = Include('/libs/typedef')
    global.ErrorCode = Include('/libs/errorCode')
    global.SnowFlake = {next: fp.constant(1)}
  })
  it('should create payment of bills', async function() {
    const req = {
      isAuthenticated: () => true,
      user: {id: 1000},
      params: {
        projectId: 100,
      },
      query: {},
      body: {
        amount: 1000,
        fundChannelId: 1,
      },

    }
    const findByIdStub = stub().resolves({
      payments: [],
      dueAmount: 1000,
      id: 1121,
      userId: 456,
    })

    const paymentCreateStub = stub().resolves({})
    const fundChannelCreateStub = stub().resolves({})
    const flowCreateStub = stub().resolves({})
    const fundFlowSearchStub = stub().resolves({
      toJSON: () => ({
        fundChannel: {
          id: 99,
          serviceCharge: [
            {
              type: 'BILL',
              strategy: {user: 40, project: 60, fee: 10},
            }],
        },
      }),
    })
    global.MySQL = {
      ... notificationStub,
      BillPayment: {
        bulkCreate: paymentCreateStub,
      },
      FundChannelFlows: {
        bulkCreate: fundChannelCreateStub,
      },
      Flows: {
        bulkCreate: flowCreateStub,
      },
      Bills: {
        findById: findByIdStub,
      },
      ReceiveChannels: {
        findOne: fundFlowSearchStub,
      },
      Sequelize: {
        transaction: async () => ({rollback: fp.noop}),
      },
    }

    await post(req, {send: fp.noop}).then(() => {
      findByIdStub.should.have.been.called
      paymentCreateStub.should.have.been.called
      flowCreateStub.should.have.been.called
      fundChannelCreateStub.should.have.been.called
    })
  })

  it('should reject creating payment when amount does not match ',
    async function() {
      const req = {
        isAuthenticated: () => true,
        user: {id: 1000},
        params: {
          projectId: 100,
          billId: 1121,
        },
        query: {},
        body: {
          amount: 9000,
          fundChannelId: 1,
        },

      }
      const findByIdStub = stub().resolves({
        payments: [],
        dueAmount: 1000,
        id: 1121,
      })

      const createStub = stub().resolves({})
      const fundFlowSearchStub = stub().resolves({})
      global.MySQL = {
        BillPayment: {
          create: createStub,
        },
        Bills: {
          findById: findByIdStub,
        },
        ReceiveChannels: {
          findOne: fundFlowSearchStub,
        },
      }
      const resSpy = spy()
      await post(req, {send: resSpy}).then(() => {
        findByIdStub.should.have.been.called
        createStub.should.not.have.been.called
        resSpy.getCall(0).args[0].should.be.eql(500)
        resSpy.getCall(0).args[1].result.should.be.eql(
          {'error': 'Bill 1121 has amount 1000, which doesn\'t match payment 9000.'})
      })
    })

  it('should reject creating payment when bill already has payment',
    async function() {
      const req = {
        isAuthenticated: () => true,
        user: {id: 1000},
        params: {
          projectId: 100,
          billId: 1121,
        },
        query: {},
        body: {
          amount: 1000,
          fundChannelId: 1,
        },

      }
      const findByIdStub = stub().resolves({
        payments: [{id: 121}],
        dueAmount: 1000,
        id: 1121,
      })

      const createStub = stub().resolves({})
      const fundFlowSearchStub = stub().resolves({})
      global.MySQL = {
        BillPayment: {
          create: createStub,
        },
        Bills: {
          findById: findByIdStub,
        },
        ReceiveChannels: {
          findOne: fundFlowSearchStub,
        },
      }
      const resSpy = spy()
      await post(req, {send: resSpy}).then(() => {
        findByIdStub.should.have.been.called
        createStub.should.not.have.been.called
        resSpy.getCall(0).args[0].should.be.eql(500)
        resSpy.getCall(0).args[1].result.should.be.eql(
          {'error': 'Bill 1121 already has payment 121.'})
      })
    })
})