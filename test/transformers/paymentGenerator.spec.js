'use strict'
const fp = require('lodash/fp')
const {fn} = require('moment')
const finalPayment = require('../../transformers/paymentGenerator').finalPayment
const sinon = require('sinon')

const sandbox = sinon.sandbox.create()

describe('Payment generator', () => {
  before(() => {
    global.SnowFlake = {next: fp.constant(9999)}
    sandbox.stub(fn, 'unix')
    fn.unix.returns(2018)
  })
  after(() => {
    sandbox.restore()
  })
  it('should generate final payment base on bill & flow', () => {
    const payment = finalPayment({
      amount: 101,
      fundChannel: {id: 199},
      projectId: 100,
      bills: [{id: 'bill1'}],
      operatorId: 19
    })
    payment.should.be.eql({
      amount: 101,
      bills: [{id: 'bill1'}],
      fundChannel: {id: 199},
      id: 9999,
      operator: 19,
      orderNo: 9999,
      paidAt: 2018,
      projectId: 100,
      status: 'approved'
    })
  })
})