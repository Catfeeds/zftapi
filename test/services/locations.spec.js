'use strict'

const {get} = require(
  '../../services/v1.0/handlers/locations')
require('include-node')
const {stub, spy} = require('sinon')

describe('Location', function() {
  before(() => {
    global.Typedef = Include('/libs/typedef')
  })
  it('should query houses by id if provided', async function() {
    const amapStub = stub().resolves([
      {
        name: 'name',
        district: 'district',
        address: 'address',
        adcode: 'adcode',
        id: 'id',
        location: '11,12',
      }])

    global.Amap = {
      InputTips: amapStub,
    }
    const req = {
      query: {
        city: 'a city',
        q: 'q',
      },
    }

    const sendSpy = spy()

    await get(req, {send: sendSpy}).then(() => {
      amapStub.should.have.been.called
      const queryParam = amapStub.getCall(0).args[0]
      queryParam.should.be.eql({
        keywords: 'q',
        city: 'a city',
      })
      sendSpy.should.has.been.called
      sendSpy.getCall(0).args[0].should.be.eql([
        {
          name: 'name',
          district: 'district',
          address: 'address',
          divisionId: 'adcode',
          code: 'id',
          longitude: '11',
          latitude: '12',
        }])
    })
  })

  it('should ignore item without id', async function() {
    const amapStub = stub().resolves([
      {
        name: 'has id',
        district: 'district',
        address: 'address',
        adcode: 'adcode',
        id: 'id',
        location: '11,12',
      }, {
        name: 'no id',
      }])

    global.Amap = {
      InputTips: amapStub,
    }
    const req = {
      query: {
        city: 'a city',
        q: 'q',
      },
    }

    const sendSpy = spy()

    await get(req, {send: sendSpy}).then(() => {
      amapStub.should.have.been.called
      sendSpy.should.has.been.called
      sendSpy.getCall(0).args[0][0].name.should.be.eql('has id')
    })
  })
  it('should report error if no city or q provided', async function() {
    const amapStub = stub().resolves([])

    global.Amap = {
      InputTips: amapStub,
    }
    const req = {
      query: {
      },
    }

    const sendSpy = spy()

    await get(req, {send: sendSpy}).then(() => {
      amapStub.should.have.not.been.called
      sendSpy.should.has.been.called
      sendSpy.getCall(0).args.should.be.eql([422, ErrorCode.ack(ErrorCode.PARAMETERMISSED)])
    })
  })
})