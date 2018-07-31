'use strict'

const {get} = require('../../services/v1.0/handlers/environments')
require('include-node')
const {spy} = require('sinon')

describe('Environments', function() {
  before(() => {
    global.Typedef = Include('/libs/typedef')
  })
  it('should return constants of zft project', async function() {
    const req = {isAuthenticated: () => false}
    const resSpy = spy()

    await get(req, {send: resSpy}).then(() => {
      const response = resSpy.getCall(0).args[0]
      response.should.shallowDeepEqual({
        length: 4,
        0: {key: 'houseFormat'},
        1: {key: 'roomType'},
        2: {key: 'operationStatus'},
        3: {key: 'orientation'},
      })
    })
  })

  it('should return user info while user logged in', async function() {
    const user = {projectId: 99, id: 10}
    const banks = [{tag: 'alipay', name: '支付宝'}]
    const house = {id: 321}
    const contract = {id: 123, room: {house}}
    const expectedContract = {id: 123, houseId: 321}
    const projectInfo = {id: 567, name: 'project name'}
    const channelRes = [{toJSON: () => ({id: 789, tag: 'tag', name: 'channel'})}]
    const channels = [{id: 789, tag: 'tag', name: 'channel'}]

    const req = {isAuthenticated: () => true, user}

    global.MySQL = {
      Auth: {
        findById: async () => ({projectId: 99, dataValues: user}),
      },
      Banks: {
        findAll: async () => banks,
      },
      Contracts: {
        findAll: async () => [{dataValues: contract}],
      },
      Users: {
        findOne: async () => user,
      },
      Projects: {
        findById: async () => projectInfo,
      },
      FundChannels: {
        findAll: async () => channelRes,
      },
    }

    const resSpy = spy()

    await get(req, {send: resSpy}).then(() => {
      const response = resSpy.getCall(0).args[0]

      response.should.shallowDeepEqual({
        length: 10,
        0: {key: 'houseFormat'},
        1: {key: 'roomType'},
        2: {key: 'operationStatus'},
        3: {key: 'orientation'},
        4: {key: 'user', value: user},
        5: {key: 'banks', value: banks},
        6: {key: 'contracts', value: [expectedContract]},
        7: {key: 'project', value: projectInfo},
        8: {key: 'features', value: {billPaymentInApp: false}},
        9: {key: 'fundChannels', value: channels},
      })
    })
  })
})