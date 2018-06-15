'use strict'

const extract = require('../../transformers/contractExtractor').extract

describe('Extract contract', () => {
  it('should extract contract info from request', async () => {
    let user = {id: 999}
    let req = {
      body: {
        roomId: 23,
        from: 1000,
        to: 2000,
        strategy: '{"name": "strategy"}',
        expenses: '{"name": "expenses"}',
        paymentPlan: 'F03',
        signUpTime: 3000
      },
      params: {
        projectId: 123
      }
    }

    await extract(req, user).then(data => {
      data.should.be.eql({
        userId: user.id,
        roomId: 23,
        from: 1000,
        to: 2000,
        strategy: '{"name": "strategy"}',
        expenses: '{"name": "expenses"}',
        paymentPlan: 'F03',
        signUpTime: 3000,
        projectId: 123
      })
    })
  })

  it('should use project from requests rather than body', async () => {
    let user = {id: 999}
    let req = {
      body: {
        roomId: 23,
        from: 1000,
        to: 2000,
        strategy: '{"name": "strategy"}',
        expenses: '{"name": "expenses"}',
        paymentPlan: 'F03',
        signUpTime: 3000,
        projectId: 123
      },
      params: {
        projectId: 321
      }
    }

    await extract(req, user).then(data => {
      data.should.be.eql({
        userId: user.id,
        roomId: 23,
        from: 1000,
        to: 2000,
        strategy: '{"name": "strategy"}',
        expenses: '{"name": "expenses"}',
        paymentPlan: 'F03',
        signUpTime: 3000,
        projectId: 321
      })
    })
  })

  it('should use user id from user object rather than body', async () => {
    let user = {id: 999}
    let req = {
      body: {
        userId: 888
      },
      params: {
        projectId: 321
      }
    }

    await extract(req, user).then(data => {
      data.should.be.eql({
        userId: 999,
        projectId: 321
      })
    })

  })
})