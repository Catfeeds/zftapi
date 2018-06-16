'use strict'

const {get} = require(
  '../../../services/v1.0/handlers/projects/:projectId/users/:userId/monthConsume')
const {spy} = require('sinon')

describe('User notification history', () => {
  it('should report all cost in given month', async () => {
    const req = {
      params: {
        projectId: 100,
        userId: 123,
      },
      query: {
        month: '201806',
      },
    }
    global.MySQL = {
      Contracts: {
        findOne: async () => ({id: 321}),
      },
      DevicePrePaid: {
        sum: async () => (100),
      },
      DailyPrePaid: {
        sum: async () => (200),
      },
    }
    const resSpy = spy()

    await get(req, {send: resSpy})

    resSpy.should.have.been.called
    resSpy.getCall(0).args[0].should.be.eql({
      month: '201806',
      consume: 300,
    })
  })
  it('should be able to tolerate NaN', async () => {
    const req = {
      params: {
        projectId: 100,
        userId: 123,
      },
      query: {
        month: '201806',
      },
    }
    global.MySQL = {
      Contracts: {
        findOne: async () => ({id: 321}),
      },
      DevicePrePaid: {
        sum: async () => (NaN),
      },
      DailyPrePaid: {
        sum: async () => (NaN),
      },
    }
    const resSpy = spy()

    await get(req, {send: resSpy})

    resSpy.should.have.been.called
    resSpy.getCall(0).args[0].should.be.eql({
      month: '201806',
      consume: 0,
    })
  })
  it('should be able to tolerate NaN from one side', async () => {
    const req = {
      params: {
        projectId: 100,
        userId: 123,
      },
      query: {
        month: '201806',
      },
    }
    global.MySQL = {
      Contracts: {
        findOne: async () => ({id: 321}),
      },
      DevicePrePaid: {
        sum: async () => (9988),
      },
      DailyPrePaid: {
        sum: async () => (NaN),
      },
    }
    const resSpy = spy()

    await get(req, {send: resSpy})

    resSpy.should.have.been.called
    resSpy.getCall(0).args[0].should.be.eql({
      month: '201806',
      consume: 9988,
    })
  })
  it('should not accept invalid month', async () => {
    const req = {
      params: {
        projectId: 100,
        userId: 123,
      },
      query: {
        month: 'xxx',
      },
    }
    const resSpy = spy()

    await get(req, {send: resSpy})

    resSpy.should.have.been.called
    resSpy.getCall(0).args.should.be.eql(
      [
        400, {
          code: 20000032,
          message: '参数错误',
          result: {
            month: 'xxx',
          },
        }])
  })

  it('should not accept invalid user', async () => {
    const req = {
      params: {
        projectId: 100,
        userId: 999,
      },
      query: {
        month: '201806',
      },
    }
    global.MySQL = {
      Contracts: {
        findOne: async () => null,
      },
    }
    const resSpy = spy()

    await get(req, {send: resSpy})

    resSpy.should.have.been.called
    resSpy.getCall(0).args.should.be.eql(
      [
        404, {
          code: 21000004,
          message: '合同不存在',
        }])
  })
})