'use strict'

const fp = require('lodash/fp')
require('include-node')
const {spy, stub, sandbox} = require('sinon')
const {get} = require(
  '../../services/v1.0/handlers/projects/:projectId/contracts/:contractId/prePaidBills')
const {fn} = require('moment')
const sandboxIns = sandbox.create()

describe('Prepaid charge records', function() {
  before(() => {
    global.Typedef = Include('/libs/typedef')
    global.ErrorCode = Include('/libs/errorCode')
    global.SnowFlake = {next: fp.constant(1)}
  })
  afterEach(() => {
    sandboxIns.restore()
  })
  it('should show operator for userId', async () => {
    sandboxIns.stub(fn, 'unix')
    fn.unix.returns(2018)

    const req = {
      params: {
        projectId: 100,
        userId: 1000,
      },
      query: {
        mode: 'topup',
      },
    }

    const fundChannelsFind = stub().resolves([
      {
        id: 1231,
        name: 'ex',
      }])

    const topupFind = stub().resolves({
      rows: [
        {
          amount: 121,
          balance: 212,
          fee: 321,
          fundChannelId: 1231,
          operatorInfo: {
            username: 'username',
          },
        }],
      count: 1,
    })

    global.MySQL = {
      Contracts: {
        findOne: async () => ({
          userId: '',
        }),
      },
      FundChannels: {
        findAll: fundChannelsFind,
      },
      Topup: {
        findAndCountAll: topupFind,
      }
    }
    const sendSpy = spy()
    await get(req, {send: sendSpy})
    fundChannelsFind.should.have.been.called
    topupFind.should.have.been.called
    sendSpy.should.have.been.called
    sendSpy.getCall(0).args[0].should.be.eql({
      data: [{
        amount: 121,
        balance: 212,
        fee: 321,
        fundChannelName: 'ex',
        operator: 'username',
        time: 2018
      }],
      paging: {
        count: 1,
        index: 1,
        size: 10,
      }
    })
  })
  it('should show operator for authId', async () => {
    sandboxIns.stub(fn, 'unix')
    fn.unix.returns(2019)

    const req = {
      params: {
        projectId: 100,
        userId: 1000,
      },
      query: {
        mode: 'topup',
      },
    }

    const fundChannelsFind = stub().resolves([
      {
        id: 1231,
        name: 'ex',
      }])

    const topupFind = stub().resolves({
      rows: [
        {
          amount: 121,
          balance: 212,
          fee: 321,
          fundChannelId: 1231,
          user: {
            auth: {
              username: 'not auth name',
            }
          },
        }],
      count: 1,
    })

    global.MySQL = {
      Contracts: {
        findOne: async () => ({
          userId: '',
        }),
      },
      FundChannels: {
        findAll: fundChannelsFind,
      },
      Topup: {
        findAndCountAll: topupFind,
      }
    }
    const sendSpy = spy()
    await get(req, {send: sendSpy})
    fundChannelsFind.should.have.been.called
    topupFind.should.have.been.called
    sendSpy.should.have.been.called
    sendSpy.getCall(0).args[0].should.be.eql({
      data: [{
        amount: 121,
        balance: 212,
        fee: 321,
        fundChannelName: 'ex',
        operator: 'not auth name',
        time: 2019
      }],
      paging: {
        count: 1,
        index: 1,
        size: 10,
      }
    })
  })
})
