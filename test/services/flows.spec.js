'use strict'
const {get} = require('../../services/v1.0/handlers/projects/:projectId/flows')
require('include-node')
const {stub, spy} = require('sinon')
const fp = require('lodash/fp')
const moment = require('moment')

describe('Flows', function() {
  before(() => {
    global.Typedef = Include('/libs/typedef')
    global.ErrorCode = Include('/libs/errorCode')
    global.Util = Include('/libs/util')
  })
  describe('By time', function() {
    it('should pass correct option while querying flows', async function() {
      const req = {
        params: {
          projectId: 100,
          roomId: 200,
        },
        query: {},
      }
      const sequelizeFindSpy = stub().resolves([])
      const Users = {id: 'Users'}
      const CashAccount = {
        findOrCreate: async () => ([
          {
            id: 321,
            userId: 1999,
          }]),
      }
      const Rooms = {id: 'Rooms'}
      const Houses = {id: 'Houses'}
      const Building = {id: 'Building'}
      const GeoLocation = {id: 'GeoLocation'}
      const Topup = {id: 'Topup'}
      const Auth = {id: 'Auth'}
      const BillPayment = {id: 'BillPayment'}
      const Contracts = {id: 'Contracts'}
      const Bills = {id: 'Bills'}
      const BillFlows = {id: 'BillFlows'}
      const FundChannelFlows = {id: 'FundChannelFlows'}
      const HouseDevices = {id: 'HouseDevices'}
      global.MySQL = {
        Flows: {
          findAndCountAll: sequelizeFindSpy,
        },
        Users,
        CashAccount,
        Rooms,
        Houses,
        Building,
        GeoLocation,
        Topup,
        Auth,
        Contracts,
        BillPayment,
        Bills,
        BillFlows,
        FundChannelFlows,
        HouseDevices,
      }

      await get(req, {send: fp.noop}).then(() => {
        sequelizeFindSpy.should.have.been.called
        const countingOption = sequelizeFindSpy.getCall(0).args[0]
        countingOption.should.be.eql({
          distinct: true,
          include: [
            {
              include: [
                {
                  attributes: [
                    'id',
                    'type',
                  ],
                  include: [
                    {
                      include: [
                        {
                          model: Users,
                          include: [
                            {
                              model: Auth,
                              attributes: ['mobile', 'username'],
                            },
                          ],
                        },
                        {
                          attributes: [
                            'id',
                            'name',
                            'houseId',
                          ],
                          include: [
                            {
                              as: 'house',
                              attributes: [
                                'id',
                                'roomNumber',
                                'buildingId',
                                'houseKeeper',
                              ],
                              include: [
                                {
                                  as: 'building',
                                  attributes: [
                                    'building',
                                    'unit',
                                  ],
                                  required: false,
                                  include: [
                                    {
                                      as: 'location',
                                      attributes: [
                                        'name',
                                      ],
                                      model: GeoLocation,
                                      paranoid: false,
                                      where: {},
                                    },
                                  ],
                                  model: Building,
                                  paranoid: false,
                                },
                              ],
                              model: Houses,
                              required: false,
                              paranoid: false,
                              where: {},
                            },
                            {
                              model: HouseDevices,
                              as: 'devices',
                              attributes: ['deviceId'],
                              required: false,
                            },
                          ],
                          required: false,
                          paranoid: false,
                          model: Rooms,
                        },
                      ],
                      model: Contracts,
                    }, {
                      model: BillFlows,
                      as: 'billItems',
                      attributes: [
                        'configId',
                        'amount',
                        'createdAt',
                        'id'],
                    }, {
                      model: FundChannelFlows,
                      required: false,
                      attributes: [
                        'id',
                        'fundChannelId',
                        'category',
                        'orderNo',
                        'from',
                        'to',
                        'amount',
                        'createdAt'],
                    },
                  ],
                  model: Bills,
                },
                {
                  attributes: [
                    'id',
                    'username',
                  ],
                  model: Auth,
                },
              ],
              required: false,
              model: BillPayment,
            },
            {
              include: [
                {
                  include: [
                    {
                      model: Users,
                      include: [
                        {
                          model: Auth,
                          attributes: ['mobile', 'username'],
                        },
                      ],
                    },
                    {
                      attributes: [
                        'id',
                        'name',
                        'houseId',
                      ],
                      required: false,
                      include: [
                        {
                          as: 'house',
                          attributes: [
                            'id',
                            'roomNumber',
                            'buildingId',
                            'houseKeeper',
                          ],
                          include: [
                            {
                              as: 'building',
                              attributes: [
                                'building',
                                'unit',
                              ],
                              required: false,
                              include: [
                                {
                                  as: 'location',
                                  attributes: [
                                    'name',
                                  ],
                                  model: GeoLocation,
                                  paranoid: false,
                                  where: {},
                                },
                              ],
                              model: Building,
                              paranoid: false,
                            },
                          ],
                          model: Houses,
                          required: false,
                          paranoid: false,
                          where: {},
                        },
                        {
                          model: HouseDevices,
                          as: 'devices',
                          attributes: ['deviceId'],
                          required: false,
                        },
                      ],
                      model: Rooms,
                      paranoid: false,
                    },
                  ],
                  model: Contracts,
                },
                {
                  as: 'operatorInfo',
                  attributes: [
                    'id',
                    'username',
                  ],
                  model: Auth,
                },
              ],
              required: false,
              model: Topup,
            },
          ],
          subQuery: false,
          where: {
            projectId: 100,
          },
          order: [
            [
              'createdAt',
              'DESC',
            ],
          ],
        })
      })
    })
    it('should filter houseFormat out while querying flows',
      async function() {
        const req = {
          params: {
            projectId: 100,
            roomId: 200,
          },
          query: {
            houseFormat: 'SOLE',
          },
        }
        const sequelizeFindSpy = stub().resolves([])
        const Users = {id: 'Users'}
        const CashAccount = {
          findOrCreate: async () => ([
            {
              id: 321,
              userId: 1999,
            }]),
        }
        const Rooms = {id: 'Rooms'}
        const Houses = {id: 'Houses'}
        const Building = {id: 'Building'}
        const GeoLocation = {id: 'GeoLocation'}
        const Topup = {id: 'Topup'}
        const Auth = {id: 'Auth'}
        const BillPayment = {id: 'BillPayment'}
        const Contracts = {id: 'Contracts'}
        const Bills = {id: 'Bills'}
        const BillFlows = {id: 'BillFlows'}
        const FundChannelFlows = {id: 'FundChannelFlows'}
        const HouseDevices = {id: 'HouseDevices'}
        global.MySQL = {
          Flows: {
            findAndCountAll: sequelizeFindSpy,
          },
          Users,
          CashAccount,
          Rooms,
          Houses,
          Building,
          GeoLocation,
          Topup,
          Auth,
          Contracts,
          BillPayment,
          Bills,
          BillFlows,
          FundChannelFlows,
          HouseDevices,
        }

        await get(req, {send: fp.noop}).then(() => {
          sequelizeFindSpy.should.have.been.called
          const countingOption = sequelizeFindSpy.getCall(0).args[0]
          countingOption.where.should.be.eql({

            projectId: 100,
            $or: [
              {'$billpayment.bill.contract.room.house.houseFormat$': req.query.houseFormat},
              {'$topup.contract.room.house.houseFormat$': req.query.houseFormat},
            ],
          })
        })
      })

    it('should convert bill payments to flows', async function() {
      const req = {
        params: {
          projectId: 100,
        },
        query: {},
      }
      global.MySQL = {
        Flows: {
          async findAndCountAll() {
            return {
              count: 1,
              rows: [
                {
                  topup: null,
                  dataValues: {
                    'id': '6361500865072861184',
                    'projectId': 100,
                    'category': 'rent',
                    'createdAt': '2018-01-23T09:33:17.000Z',
                    'updatedAt': '2018-01-23T09:33:17.000Z',
                    'deletedAt': null,
                  },
                  billpayment: {
                    dataValues: {
                      'id': '6361500865093832704',
                      'billId': '6361497127071387648',
                      'projectId': 100,
                      'flowId': '6361500865072861184',
                      'amount': 75600,
                      'fundChannelId': 3,
                      'operator': 1,
                      'paidAt': 1516699996,
                      'remark': 'payment is good',
                      'status': 'pending',
                      'createdAt': '2018-01-23T09:33:17.000Z',
                      'updatedAt': '2018-01-23T09:33:17.000Z',
                      'deletedAt': null,
                      auth: {
                        'id': 1,
                        'username': 'admin100',
                      },
                      bill: {
                        dataValues: {
                          'metadata': {},
                          'id': '6361497127071387648',
                          'type': 'rent',
                        },
                        billItems: [
                          {
                            'configId': 121,
                            'amount': 21600,
                            'createdAt': 1517010240,
                            'id': '6362802119761858560',
                          },
                        ],
                        fundChannelFlows: [
                          {
                            id: '6364086113442861056',
                            category: 'TOPUP',
                            orderNo: '6364086113375752192',
                            from: 0,
                            to: '6364085892113633280',
                            amount: 75600,
                          },
                        ],
                        contract: {
                          'user': {
                            'id': 1,
                            'accountName': 'f1',
                            'name': 'www',
                            'mobile': '',
                            'documentId': '',
                            'documentType': 1,
                            'gender': 'M',
                          },
                          room: {
                            toJSON: () => ({
                              config: {},
                              id: '6361497057362055170',
                              name: '1',
                              status: 'IDLE',
                              house: {
                                config: {},
                                id: '6361497057362055168',
                                roomNumber: '2301',
                                building: {
                                  config: {},
                                  building: '一幢',
                                  unit: '1单元',
                                  group: '某',
                                  location: {
                                    name: '新帝朗郡',
                                  },
                                },
                              },
                              devices: [
                                {
                                  deviceId: 123,
                                }],
                            }),
                          },
                          'id': '6361497126945558528',
                          'roomId': '6361497057362055170',
                          'projectId': 100,
                          'from': 1513599462,
                          'to': 1545135462,
                          'contractNumber': '',
                          'paymentPlan': 'F02',
                          'signUpTime': 1513599462,
                          'status': 'ONGOING',
                          'actualEndDate': null,
                          'createdAt': '2018-01-23T09:18:25.000Z',
                          'updatedAt': '2018-01-23T09:18:25.000Z',
                          'deletedAt': null,
                          'userId': 1,
                        },
                      },

                    },

                  },
                }],
            }
          },
        },
      }
      const resSpy = spy()

      await get(req, {send: resSpy}).then(() => {
        resSpy.should.have.been.called
        resSpy.getCall(0).args[0].data[0].should.be.eql({
          'amount': 75600,
          'category': 'rent',
          'contract': {
            'id': '6361497126945558528',
            'from': 1513599462,
            'to': 1545135462,
            'status': 'ONGOING',
            'actualEndDate': null,
          },
          'fundChannelId': 3,
          'id': '6361500865072861184',
          'operator': {
            'id': 1,
            'username': 'admin100',
          },
          'paidAt': 1516699996,
          'projectId': 100,
          'remark': 'payment is good',
          room: {
            building: '一幢',
            group: '某',
            houseId: '6361497057362055168',
            id: '6361497057362055170',
            locationName: '新帝朗郡',
            roomName: '1',
            roomNumber: '2301',
            status: 'IDLE',
            unit: '1单元',
            devices: [
              {
                deviceId: 123,
              }],
          },
          status: 'pending',
          user: {
            'accountName': 'f1',
            'name': 'www',
            'id': 1,
            'mobile': '',
          },
          billItems: [
            {
              'configId': 121,
              'amount': 21600,
              'createdAt': 1517010240,
              'id': '6362802119761858560',
            }],
          fundChannelFlows: [
            {
              id: '6364086113442861056',
              category: 'TOPUP',
              orderNo: '6364086113375752192',
              from: 0,
              to: '6364085892113633280',
              amount: 75600,
            }],
        })
      })
    })

    it('should convert topup to flows', async function() {
      const req = {
        params: {
          projectId: 100,
        },
        query: {},
      }
      global.MySQL = {
        Flows: {
          async findAndCountAll() {
            return {
              count: 1,
              rows: [
                {
                  topup: {
                    dataValues: {
                      'id': '6361765825690603521',
                      'orderNo': '6361765825690603520',
                      'userId': 1,
                      'flowId': 6361765825669632000,
                      'externalId': '',
                      'contractId': '6361765640847626240',
                      'projectId': 100,
                      'amount': 123,
                      'fundChannelId': 1,
                      'operator': 1,
                      'createdAt': '2018-01-24T03:06:08.000Z',
                      'updatedAt': '2018-01-24T03:06:08.000Z',
                      'deletedAt': null,
                      'remark': 'topup is good',
                      contract: {
                        user: {
                          'id': 1,
                          'accountName': 'f1',
                          'name': 'www',
                          'mobile': '',
                          'documentId': '',
                          'documentType': 1,
                          'gender': 'M',
                        },
                        room: {
                          toJSON: () => ({
                            config: {},
                            id: '6361497057362055170',
                            name: '1',
                            status: 'IDLE',
                            house: {
                              config: {},
                              id: '6361497057362055168',
                              roomNumber: '2301',
                              building: {
                                config: {},
                                building: '一幢',
                                unit: '1单元',
                                group: '某',
                                location: {
                                  name: '新帝朗郡',
                                },
                              },
                            },
                            devices: [
                              {
                                deviceId: 123,
                              }],
                          }),
                        },
                        'id': '6361497126945558528',
                        'roomId': '6361497057362055170',
                        'projectId': 100,
                        'from': 1513599462,
                        'to': 1545135462,
                        'contractNumber': '',
                        'paymentPlan': 'F02',
                        'signUpTime': 1513599462,
                        'status': 'ONGOING',
                        'actualEndDate': null,
                        'createdAt': '2018-01-24T03:06:08.000Z',
                        'updatedAt': '2018-01-24T03:06:08.000Z',
                        'deletedAt': null,
                        'userId': 1,
                      },
                      operatorInfo: {
                        'id': 1,
                        'username': 'admin100',
                      },
                    },
                  },
                  dataValues: {
                    'id': 6361765825669632000,
                    'projectId': 100,
                    'category': 'topup',
                    'createdAt': '2018-01-24T03:06:08.000Z',
                    'updatedAt': '2018-01-24T03:06:08.000Z',
                    'deletedAt': null,
                  },
                  billpayment: null,
                }],
            }
          },
        },
      }
      const resSpy = spy()

      await get(req, {send: resSpy}).then(() => {
        resSpy.should.have.been.called
        resSpy.getCall(0).args[0].data[0].should.be.eql({
          'amount': 123,
          'category': 'topup',
          'contract': {
            'id': '6361497126945558528',
            'from': 1513599462,
            'to': 1545135462,
            'status': 'ONGOING',
            'actualEndDate': null,
          },
          'externalId': '',
          'fundChannelId': 1,
          'id': 6361765825669632000,
          'orderNo': '6361765825690603520',
          'operator': {
            'id': 1,
            'username': 'admin100',
          },
          'paidAt': 1516763168,
          'projectId': 100,
          room: {
            building: '一幢',
            group: '某',
            houseId: '6361497057362055168',
            id: '6361497057362055170',
            locationName: '新帝朗郡',
            roomName: '1',
            roomNumber: '2301',
            status: 'IDLE',
            unit: '1单元',
            devices: [
              {
                deviceId: 123,
              }],
          },
          user: {
            'accountName': 'f1',
            'name': 'www',
            'id': 1,
            'mobile': '',
          },
          remark: 'topup is good',
        })
      })
    })

    it('should accept filter from / to', async function() {
      const req = {
        params: {
          projectId: 100,
          roomId: 200,
        },
        query: {from: 1243599462, to: 1243699462},
      }
      const sequelizeFindSpy = stub().resolves([])
      global.MySQL = {
        Flows: {
          findAndCountAll: sequelizeFindSpy,
        },
      }

      await get(req, {send: fp.noop}).then(() => {
        sequelizeFindSpy.should.have.been.called
        const countingOption = sequelizeFindSpy.getCall(0).args[0]
        countingOption.where.should.be.eql({
          projectId: 100,
          createdAt: {
            $gte: moment(req.query.from * 1000).
              format('YYYY-MM-DD HH:mm:ss'),
            $lte: moment(req.query.to * 1000).
              format('YYYY-MM-DD HH:mm:ss'),
          },
        })
      })
    })
    it('should accept filter q', async function() {
      const req = {
        params: {
          projectId: 100,
          roomId: 200,
        },
        query: {q: 'some words'},
      }
      const sequelizeFindSpy = stub().resolves([])
      global.MySQL = {
        Flows: {
          findAndCountAll: sequelizeFindSpy,
        },
      }

      await get(req, {send: fp.noop}).then(() => {
        sequelizeFindSpy.should.have.been.called
        const countingOption = sequelizeFindSpy.getCall(0).args[0]
        countingOption.where.should.be.eql({
          projectId: 100,
          $or: [
            {
              '$billpayment.bill.contract.room.house.building.location.name$': {
                $regexp: 'some words',
              },
            },
            {
              '$billpayment.bill.contract.room.house.roomNumber$': {
                $regexp: 'some words',
              },
            },
            {
              '$billpayment.bill.contract.room.house.code$': {
                $regexp: 'some words',
              },
            },
            {
              '$billpayment.bill.contract.user.name$': {
                $regexp: 'some words',
              },
            },
            {
              '$billpayment.bill.contract.user.auth.mobile$': {
                $regexp: 'some words',
              },
            },
            {
              '$topup.contract.room.house.building.location.name$': {
                $regexp: 'some words',
              },
            },
            {
              '$topup.contract.room.house.roomNumber$': {
                $regexp: 'some words',
              },
            },
            {
              '$topup.contract.room.house.code$': {
                $regexp: 'some words',
              },
            },
            {
              '$topup.contract.user.name$': {
                $regexp: 'some words',
              },
            },
            {
              '$topup.contract.user.auth.mobile$': {
                $regexp: 'some words',
              },
            },
          ],
        })
      })
    })

    it('should validate filter from / to', async function() {
      const req = {
        params: {
          projectId: 100,
          roomId: 200,
        },
        query: {from: 100, to: 99},
      }

      const resSpy = spy()

      await get(req, {send: resSpy}).then(() => {
        resSpy.should.have.been.called
        resSpy.getCall(0).args[0].should.be.eql(400)
      })
    })
  })

  describe('By category', function() {
    it('should exec raw sql to database', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          view: 'category',
        },
      }
      const sequelizeQuerySpy = stub().resolves([])

      global.MySQL = {
        Sequelize: {
          query: sequelizeQuerySpy,
          QueryTypes: {
            SELECT: 'SELECT',
          },
        },

      }

      await get(req, {send: fp.noop}).then(() => {
        sequelizeQuerySpy.should.have.been.called
        const [sql, option] = sequelizeQuerySpy.getCall(0).args
        sql.should.be.eql(
          'select\n  id, name,\n  sum(rentPart) as rent,\n  ' +
                    'sum(rentPartFee) as rentFee,\n  sum(topupPart) as topup,\n  ' +
                    'sum(topupFeePart) as topupFee,\n  sum(finalPayPart) as finalPay, \n' +
                    '  sum(finalReceivePart) as finalReceive, \n' +
                    '  (select sum(rentPart) - sum(rentPartFee) + ' +
                    'sum(topupPart) - sum(topupFeePart) - sum(finalPayPart) + ' +
                    'sum(finalReceivePart)) as balance  from (select l.id, l.name,\n' +
                    '  sum(case\n      when f.category=\'rent\' then f.amount else 0\n' +
                    '      end) as rentPart,\n  sum(case\n      when f.category=\'rent\' then fee else 0\n' +
                    '      end) as rentPartFee,\n  0 as topupPart,\n  0 as topupFeePart,\n  sum(case\n' +
                    '      when (f.category=\'final\' and f.direction=\'pay\') then f.amount else 0\n' +
                    '      end) as finalPayPart, \n  sum(case\n      when (f.category=\'final\' and f.direction=\'receive\') then f.amount else 0\n' +
                    '      end) as finalReceivePart\nfrom\n  billpayment b,\n  bills b2,\n  flows f,\n  contracts c,\n' +
                    '  houses h,\n  rooms r,\n  location l,\n  buildings\nwhere\n  f.id = b.flowId\n  and b2.id = b.billId\n' +
                    '  and c.id = b2.contractId\n  and b.projectId = :projectId \n  and c.roomId = r.id\n  and r.houseId = h.id\n' +
                    '  and h.buildingId = buildings.id\n  and buildings.locationId = l.id\nGROUP BY l.id, l.name\n UNION\nselect l.id, l.name,\n' +
                    '  0 as rentPart,\n  0 as rentPartFee,\n  sum(case\n      when f.category=\'topup\' then f.amount else 0\n      end) as topupPart,\n' +
                    '  sum(case\n      when f.category=\'topup\' then fee else 0\n      end) as topupPartFee,\n  0 as finalPayPart, \n  0 as finalReceivePart \n' +
                    'from\n  topup t,\n  flows f,\n  contracts c,\n  houses h,\n  rooms r,\n  location l,\n  buildings\nwhere\n  f.id = t.flowId\n' +
                    '  and c.id = t.contractId\n  and t.projectId = :projectId \n  and c.roomId = r.id\n  and r.houseId = h.id\n' +
                    '  and h.buildingId = buildings.id\n  and buildings.locationId = l.id\nGROUP BY l.id, l.name\n     ) as f2\n' +
                    'GROUP BY id, name',
        )
        
        option.should.be.eql({
          replacements: {
            locationIds: [''],
            projectId: 100,
          }, type: 'SELECT',
        })
      })
    })

    it('should exec raw sql for grouping by houseId', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          view: 'category',
          housesInLocation: 321,
        },
      }
      const sequelizeQuerySpy = stub().resolves([])

      global.MySQL = {
        Sequelize: {
          query: sequelizeQuerySpy,
          QueryTypes: {
            SELECT: 'SELECT',
          },
        },

      }

      await get(req, {send: fp.noop}).then(() => {
        sequelizeQuerySpy.should.have.been.called
        const [sql, option] = sequelizeQuerySpy.getCall(0).args
        sql.should.be.eql(
          'select id,\n  sum(rentPart) as rent,\n  ' +
                    'sum(rentPartFee) as rentFee,\n  sum(topupPart) as topup,\n  ' +
                    'sum(topupFeePart) as topupFee,\n  sum(finalPayPart) as finalPay, \n' +
                    '  sum(finalReceivePart) as finalReceive, \n' +
                    '  (select sum(rentPart) - sum(rentPartFee) + ' +
                    'sum(topupPart) - sum(topupFeePart) - sum(finalPayPart) + ' +
                    'sum(finalReceivePart)) as balance  from (select h.id,\n' +
                    '  sum(case\n      when f.category=\'rent\' then f.amount else 0\n' +
                    '      end) as rentPart,\n  sum(case\n      when f.category=\'rent\' then fee else 0\n' +
                    '      end) as rentPartFee,\n  0 as topupPart,\n  0 as topupFeePart,\n  sum(case\n' +
                    '      when (f.category=\'final\' and f.direction=\'pay\') then f.amount else 0\n' +
                    '      end) as finalPayPart, \n  sum(case\n      when (f.category=\'final\' and f.direction=\'receive\') then f.amount else 0\n' +
                    '      end) as finalReceivePart\nfrom\n  billpayment b,\n  bills b2,\n  flows f,\n  contracts c,\n' +
                    '  houses h,\n  rooms r,\n  location l,\n  buildings\nwhere\n  f.id = b.flowId\n  and b2.id = b.billId\n' +
                    '  and c.id = b2.contractId\n  and b.projectId = :projectId \n  and c.roomId = r.id\n  and r.houseId = h.id\n' +
                    '  and h.buildingId = buildings.id\n  and buildings.locationId = l.id\n and buildings.locationId = 321 GROUP BY h.id\n UNION\nselect h.id,\n' +
                    '  0 as rentPart,\n  0 as rentPartFee,\n  sum(case\n      when f.category=\'topup\' then f.amount else 0\n      end) as topupPart,\n' +
                    '  sum(case\n      when f.category=\'topup\' then fee else 0\n      end) as topupPartFee,\n  0 as finalPayPart, \n  0 as finalReceivePart \n' +
                    'from\n  topup t,\n  flows f,\n  contracts c,\n  houses h,\n  rooms r,\n  location l,\n  buildings\nwhere\n  f.id = t.flowId\n' +
                    '  and c.id = t.contractId\n  and t.projectId = :projectId \n  and c.roomId = r.id\n  and r.houseId = h.id\n' +
                    '  and h.buildingId = buildings.id\n  and buildings.locationId = l.id\n and buildings.locationId = 321 GROUP BY h.id\n     ) as f2\n' +
                    ' GROUP BY id',
        )
        
        option.should.be.eql({
          replacements: {
            locationIds: [''],
            projectId: 100,
          }, type: 'SELECT',
        })
      })
    })
  })
  describe('By month', function() {
    it('should exec raw sql to database', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          view: 'month',
          year: 2018,
        },
      }
      const sequelizeQuerySpy = stub().resolves([])

      global.MySQL = {
        Sequelize: {
          query: sequelizeQuerySpy,
          QueryTypes: {
            SELECT: 'SELECT',
          },
        },

      }

      await get(req, {send: fp.noop}).then(() => {
        sequelizeQuerySpy.should.have.been.called
        const [sql] = sequelizeQuerySpy.getCall(0).args
        sql.should.be.eql(
          'select\n  id, name, month,\n  sum(rentPart) as rent,\n  ' +
                    'sum(rentPartFee) as rentFee,\n  sum(topupPart) as topup,\n  ' +
                    'sum(topupFeePart) as topupFee,\n  sum(finalPayPart) as finalPay, \n' +
                    '  sum(finalReceivePart) as finalReceive, \n' +
                    '  (select sum(rentPart) - sum(rentPartFee) + ' +
                    'sum(topupPart) - sum(topupFeePart) - sum(finalPayPart) + ' +
                    'sum(finalReceivePart)) as balance  from (select l.id, l.name,   DATE_FORMAT(f.createdAt, \'%Y-%m\') as month, \n' +
                    '  sum(case\n      when f.category=\'rent\' then f.amount else 0\n' +
                    '      end) as rentPart,\n  sum(case\n      when f.category=\'rent\' then fee else 0\n' +
                    '      end) as rentPartFee,\n  0 as topupPart,\n  0 as topupFeePart,\n  sum(case\n' +
                    '      when (f.category=\'final\' and f.direction=\'pay\') then f.amount else 0\n' +
                    '      end) as finalPayPart, \n  sum(case\n      when (f.category=\'final\' and f.direction=\'receive\') then f.amount else 0\n' +
                    '      end) as finalReceivePart\nfrom\n  billpayment b,\n  bills b2,\n  flows f,\n  contracts c,\n' +
                    '  houses h,\n  rooms r,\n  location l,\n  buildings\nwhere\n  f.id = b.flowId\n  and b2.id = b.billId\n' +
                    '  and c.id = b2.contractId\n  and b.projectId = :projectId \n  and c.roomId = r.id\n  and r.houseId = h.id\n' +
                    '  and h.buildingId = buildings.id\n  and buildings.locationId = l.id\n  and f.createdAt > :from  and f.createdAt < :to \nGROUP BY l.id, l.name, month\n' +
                    ' UNION\nselect l.id, l.name,   DATE_FORMAT(f.createdAt, \'%Y-%m\') as month,\n' +
                    '  0 as rentPart,\n  0 as rentPartFee,\n  sum(case\n      when f.category=\'topup\' then f.amount else 0\n      end) as topupPart,\n' +
                    '  sum(case\n      when f.category=\'topup\' then fee else 0\n      end) as topupPartFee,\n  0 as finalPayPart, \n  0 as finalReceivePart \n' +
                    'from\n  topup t,\n  flows f,\n  contracts c,\n  houses h,\n  rooms r,\n  location l,\n  buildings\nwhere\n  f.id = t.flowId\n' +
                    '  and c.id = t.contractId\n  and t.projectId = :projectId \n  and c.roomId = r.id\n  and r.houseId = h.id\n' +
                    '  and h.buildingId = buildings.id\n  and buildings.locationId = l.id\n  and f.createdAt > :from  and f.createdAt < :to \nGROUP BY l.id, l.name, month\n     ) as f2\n' +
                    'GROUP BY id, name, month',
        )
      })
    })

    it('should exec raw sql for grouping by houseId', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          view: 'month',
          year: 2018,
          housesInLocation: 321,
        },
      }
      const sequelizeQuerySpy = stub().resolves([])

      global.MySQL = {
        Sequelize: {
          query: sequelizeQuerySpy,
          QueryTypes: {
            SELECT: 'SELECT',
          },
        },

      }

      await get(req, {send: fp.noop}).then(() => {
        sequelizeQuerySpy.should.have.been.called
        const [sql] = sequelizeQuerySpy.getCall(0).args
        sql.should.be.eql(
          'select id,\n  month,  sum(rentPart) as rent,\n  ' +
                    'sum(rentPartFee) as rentFee,\n  sum(topupPart) as topup,\n  ' +
                    'sum(topupFeePart) as topupFee,\n  sum(finalPayPart) as finalPay, \n' +
                    '  sum(finalReceivePart) as finalReceive, \n' +
                    '  (select sum(rentPart) - sum(rentPartFee) + ' +
                    'sum(topupPart) - sum(topupFeePart) - sum(finalPayPart) + ' +
                    'sum(finalReceivePart)) as balance  from (select h.id,\n  DATE_FORMAT(f.createdAt, \'%Y-%m\') month,' +
                    '  sum(case\n      when f.category=\'rent\' then f.amount else 0\n' +
                    '      end) as rentPart,\n  sum(case\n      when f.category=\'rent\' then fee else 0\n' +
                    '      end) as rentPartFee,\n  0 as topupPart,\n  0 as topupFeePart,\n  sum(case\n' +
                    '      when (f.category=\'final\' and f.direction=\'pay\') then f.amount else 0\n' +
                    '      end) as finalPayPart, \n  sum(case\n      when (f.category=\'final\' and f.direction=\'receive\') then f.amount else 0\n' +
                    '      end) as finalReceivePart\nfrom\n  billpayment b,\n  bills b2,\n  flows f,\n  contracts c,\n' +
                    '  houses h,\n  rooms r,\n  location l,\n  buildings\nwhere\n  f.id = b.flowId\n  and b2.id = b.billId\n' +
                    '  and c.id = b2.contractId\n  and b.projectId = :projectId \n  and c.roomId = r.id\n  and r.houseId = h.id\n' +
                    '  and h.buildingId = buildings.id\n  and buildings.locationId = l.id\n  and f.createdAt > :from  and f.createdAt < :to \n\n and buildings.locationId = 321 GROUP BY h.id, month\n UNION\nselect h.id,\n' +
                    '  DATE_FORMAT(f.createdAt, \'%Y-%m\') month,  0 as rentPart,\n  0 as rentPartFee,\n  sum(case\n      when f.category=\'topup\' then f.amount else 0\n      end) as topupPart,\n' +
                    '  sum(case\n      when f.category=\'topup\' then fee else 0\n      end) as topupPartFee,\n  0 as finalPayPart, \n  0 as finalReceivePart \n' +
                    'from\n  topup t,\n  flows f,\n  contracts c,\n  houses h,\n  rooms r,\n  location l,\n  buildings\nwhere\n  f.id = t.flowId\n' +
                    '  and c.id = t.contractId\n  and t.projectId = :projectId \n  and c.roomId = r.id\n  and r.houseId = h.id\n' +
                    '  and h.buildingId = buildings.id\n  and buildings.locationId = l.id\n  and f.createdAt > :from  and f.createdAt < :to \n\n and buildings.locationId = 321 GROUP BY h.id, month\n     ) as f2\n' +
                    ' GROUP BY id, month',
        )
      })
    })
    it('should reduce amount base on source', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          view: 'month',
          year: 2018,
          source: 'rent',
        },
      }
      const sendSpy = spy()
      const sequelizeQuerySpy = stub().resolves([
        {
          id: '6380921449204551680',
          name: '新帝朗郡',
          rent: 1000,
          rentFee: 10,
          topup: 2000,
          topupFee: 20,
          finalPay: 20000,
          finalReceive: 30000,
          balance: 12970,
          month: '2018-01',
        }])

      global.MySQL = {
        Sequelize: {
          query: sequelizeQuerySpy,
          QueryTypes: {
            SELECT: 'SELECT',
          },
        },

      }

      await get(req, {send: sendSpy}).then(() => {
        sequelizeQuerySpy.should.have.been.called
        sendSpy.should.have.been.called
        const monthData = sendSpy.getCall(0).args
        monthData.should.be.eql(
          [
            [
              {
                'id': '6380921449204551680',
                'months': {
                  '2018-01': 1000,
                  '2018-02': '-',
                  '2018-03': '-',
                  '2018-04': '-',
                  '2018-05': '-',
                  '2018-06': '-',
                  '2018-07': '-',
                  '2018-08': '-',
                  '2018-09': '-',
                  '2018-10': '-',
                  '2018-11': '-',
                  '2018-12': '-',
                },
                'name': '新帝朗郡',
              },
            ],
          ],
        )
      })
    })
    it('should reduce amount of source topup', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          view: 'month',
          year: 2018,
          source: 'topup',
        },
      }
      const sendSpy = spy()
      const sequelizeQuerySpy = stub().resolves([
        {
          id: '6380921449204551680',
          name: '新帝朗郡',
          rent: 1000,
          rentFee: 10,
          topup: 2000,
          topupFee: 20,
          finalPay: 20000,
          finalReceive: 30000,
          balance: 12970,
          month: '2018-01',
        }])

      global.MySQL = {
        Sequelize: {
          query: sequelizeQuerySpy,
          QueryTypes: {
            SELECT: 'SELECT',
          },
        },

      }

      await get(req, {send: sendSpy}).then(() => {
        sequelizeQuerySpy.should.have.been.called
        sendSpy.should.have.been.called
        const monthData = sendSpy.getCall(0).args
        monthData.should.be.eql(
          [
            [
              {
                'id': '6380921449204551680',
                'months': {
                  '2018-01': 2000,
                  '2018-02': '-',
                  '2018-03': '-',
                  '2018-04': '-',
                  '2018-05': '-',
                  '2018-06': '-',
                  '2018-07': '-',
                  '2018-08': '-',
                  '2018-09': '-',
                  '2018-10': '-',
                  '2018-11': '-',
                  '2018-12': '-',
                },
                'name': '新帝朗郡',
              },
            ],
          ],
        )
      })
    })
    it('should reduce amount of source final', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          view: 'month',
          year: 2018,
          source: 'final',
        },
      }
      const sendSpy = spy()
      const sequelizeQuerySpy = stub().resolves([
        {
          id: '6380921449204551680',
          name: '新帝朗郡',
          rent: 1000,
          rentFee: 10,
          topup: 2000,
          topupFee: 20,
          finalPay: 20000,
          finalReceive: 30000,
          balance: 12970,
          month: '2018-01',
        }])

      global.MySQL = {
        Sequelize: {
          query: sequelizeQuerySpy,
          QueryTypes: {
            SELECT: 'SELECT',
          },
        },

      }

      await get(req, {send: sendSpy}).then(() => {
        sequelizeQuerySpy.should.have.been.called
        sendSpy.should.have.been.called
        const monthData = sendSpy.getCall(0).args
        monthData.should.be.eql(
          [
            [
              {
                'id': '6380921449204551680',
                'months': {
                  '2018-01': 10000,
                  '2018-02': '-',
                  '2018-03': '-',
                  '2018-04': '-',
                  '2018-05': '-',
                  '2018-06': '-',
                  '2018-07': '-',
                  '2018-08': '-',
                  '2018-09': '-',
                  '2018-10': '-',
                  '2018-11': '-',
                  '2018-12': '-',
                },
                'name': '新帝朗郡',
              },
            ],
          ],
        )
      })
    })
    it('should reduce amount of finalPay', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          view: 'month',
          year: 2018,
          source: 'final',
          category: 'finalPay',
        },
      }
      const sendSpy = spy()
      const sequelizeQuerySpy = stub().resolves([
        {
          id: '6380921449204551680',
          name: '新帝朗郡',
          rent: 1000,
          rentFee: 10,
          topup: 2000,
          topupFee: 20,
          finalPay: 20000,
          finalReceive: 30000,
          balance: 12970,
          month: '2018-01',
        }])

      global.MySQL = {
        Sequelize: {
          query: sequelizeQuerySpy,
          QueryTypes: {
            SELECT: 'SELECT',
          },
        },

      }

      await get(req, {send: sendSpy}).then(() => {
        sequelizeQuerySpy.should.have.been.called
        sendSpy.should.have.been.called
        const monthData = sendSpy.getCall(0).args
        monthData.should.be.eql(
          [
            [
              {
                'id': '6380921449204551680',
                'months': {
                  '2018-01': 20000,
                  '2018-02': '-',
                  '2018-03': '-',
                  '2018-04': '-',
                  '2018-05': '-',
                  '2018-06': '-',
                  '2018-07': '-',
                  '2018-08': '-',
                  '2018-09': '-',
                  '2018-10': '-',
                  '2018-11': '-',
                  '2018-12': '-',
                },
                'name': '新帝朗郡',
              },
            ],
          ],
        )
      })
    })
    it('should reduce amount of rent fee', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          view: 'month',
          year: 2018,
          source: 'rent',
          category: 'fee',
        },
      }
      const sendSpy = spy()
      const sequelizeQuerySpy = stub().resolves([
        {
          id: '6380921449204551680',
          name: '新帝朗郡',
          rent: 1000,
          rentFee: 10,
          topup: 2000,
          topupFee: 20,
          finalPay: 20000,
          finalReceive: 30000,
          balance: 12970,
          month: '2018-01',
        }])

      global.MySQL = {
        Sequelize: {
          query: sequelizeQuerySpy,
          QueryTypes: {
            SELECT: 'SELECT',
          },
        },

      }

      await get(req, {send: sendSpy}).then(() => {
        sequelizeQuerySpy.should.have.been.called
        sendSpy.should.have.been.called
        const monthData = sendSpy.getCall(0).args
        monthData.should.be.eql(
          [
            [
              {
                'id': '6380921449204551680',
                'months': {
                  '2018-01': 10,
                  '2018-02': '-',
                  '2018-03': '-',
                  '2018-04': '-',
                  '2018-05': '-',
                  '2018-06': '-',
                  '2018-07': '-',
                  '2018-08': '-',
                  '2018-09': '-',
                  '2018-10': '-',
                  '2018-11': '-',
                  '2018-12': '-',
                },
                'name': '新帝朗郡',
              },
            ],
          ],
        )
      })
    })
    it('should reduce amount of all fee', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          view: 'month',
          year: 2018,
          source: 'all',
          category: 'fee',
        },
      }
      const sendSpy = spy()
      const sequelizeQuerySpy = stub().resolves([
        {
          id: '6380921449204551680',
          name: '新帝朗郡',
          rent: 1000,
          rentFee: 10,
          topup: 2000,
          topupFee: 20,
          finalPay: 20000,
          finalReceive: 30000,
          balance: 12970,
          month: '2018-01',
        }])

      global.MySQL = {
        Sequelize: {
          query: sequelizeQuerySpy,
          QueryTypes: {
            SELECT: 'SELECT',
          },
        },

      }

      await get(req, {send: sendSpy}).then(() => {
        sequelizeQuerySpy.should.have.been.called
        sendSpy.should.have.been.called
        const monthData = sendSpy.getCall(0).args
        monthData.should.be.eql(
          [
            [
              {
                'id': '6380921449204551680',
                'months': {
                  '2018-01': 30,
                  '2018-02': '-',
                  '2018-03': '-',
                  '2018-04': '-',
                  '2018-05': '-',
                  '2018-06': '-',
                  '2018-07': '-',
                  '2018-08': '-',
                  '2018-09': '-',
                  '2018-10': '-',
                  '2018-11': '-',
                  '2018-12': '-',
                },
                'name': '新帝朗郡',
              },
            ],
          ],
        )
      })
    })
    it('should reduce amount of all income', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          view: 'month',
          year: 2018,
          source: 'all',
          category: 'income',
        },
      }
      const sendSpy = spy()
      const sequelizeQuerySpy = stub().resolves([
        {
          id: '6380921449204551680',
          name: '新帝朗郡',
          rent: 1000,
          rentFee: 10,
          topup: 2000,
          topupFee: 20,
          finalPay: 20000,
          finalReceive: 30000,
          balance: 12970,
          month: '2018-01',
        }])

      global.MySQL = {
        Sequelize: {
          query: sequelizeQuerySpy,
          QueryTypes: {
            SELECT: 'SELECT',
          },
        },

      }

      await get(req, {send: sendSpy}).then(() => {
        sequelizeQuerySpy.should.have.been.called
        sendSpy.should.have.been.called
        const monthData = sendSpy.getCall(0).args
        monthData.should.be.eql(
          [
            [
              {
                'id': '6380921449204551680',
                'months': {
                  '2018-01': 3000,
                  '2018-02': '-',
                  '2018-03': '-',
                  '2018-04': '-',
                  '2018-05': '-',
                  '2018-06': '-',
                  '2018-07': '-',
                  '2018-08': '-',
                  '2018-09': '-',
                  '2018-10': '-',
                  '2018-11': '-',
                  '2018-12': '-',
                },
                'name': '新帝朗郡',
              },
            ],
          ],
        )
      })
    })
  })
  describe('By channel', function() {
    it('should reduce amount of balance by default', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          view: 'channel',
          from: 1,
          to: 2,
        },
      }
      const sendSpy = spy()
      const sequelizeQuerySpy = stub().resolves([
        {
          fundChannelId: 1,
          rent: 1000,
          rentFee: 10,
          topup: 2000,
          topupFee: 20,
          finalPay: 20000,
          finalReceive: 30000,
          balance: 12970,
          timespan: '2018-01',
        }])

      global.MySQL = {
        Sequelize: {
          query: sequelizeQuerySpy,
          QueryTypes: {
            SELECT: 'SELECT',
          },
        },

      }

      await get(req, {send: sendSpy}).then(() => {
        sequelizeQuerySpy.should.have.been.called
        sendSpy.should.have.been.called
        const channelData = sendSpy.getCall(0).args
        channelData.should.be.eql(
          [
            [
              {
                timespan: '2018-01',
                channels: {
                  '1': 12970,
                },
                total: 12970,
              },
            ],
          ],
        )
      })
    })
    it('should can group data by day', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          view: 'channel',
          from: 1,
          to: 2,
          timespan: 'day',
        },
      }
      const sendSpy = spy()
      const sequelizeQuerySpy = stub().resolves([
        {
          fundChannelId: 1,
          rent: 1000,
          rentFee: 10,
          topup: 2000,
          topupFee: 20,
          finalPay: 20000,
          finalReceive: 30000,
          balance: 12970,
          timespan: '2018-01-01',
        },
        {
          fundChannelId: 2,
          rent: 3000,
          rentFee: 10,
          topup: 2000,
          topupFee: 20,
          finalPay: 20000,
          finalReceive: 30000,
          balance: 15970,
          timespan: '2018-03-01',
        }])

      global.MySQL = {
        Sequelize: {
          query: sequelizeQuerySpy,
          QueryTypes: {
            SELECT: 'SELECT',
          },
        },

      }

      await get(req, {send: sendSpy}).then(() => {
        sequelizeQuerySpy.should.have.been.called
        sendSpy.should.have.been.called
        const channelData = sendSpy.getCall(0).args
        channelData.should.be.eql(
          [
            [
              {
                timespan: '2018-03-01',
                channels: {
                  '1': 0,
                  '2': 15970,
                },
                total: 15970,
              },
              {
                timespan: '2018-01-01',
                channels: {
                  '1': 12970,
                  '2': 0,
                },
                total: 12970,
              },
            ],
          ],
        )
      })
    })
  })
})