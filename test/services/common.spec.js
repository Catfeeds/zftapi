'use strict'
const {
  includeContracts, payBills, serviceCharge,
  moveFundChannelToRoot, shareFlows, platformFlows, logFlows,
  convertRoomNumber, topUp, translateDevices, getAddrId, getBuildingId,
  translateRooms,
} = require(
  '../../services/v1.0/common')
const {spy, stub} = require('sinon')
const moment = require('moment')
const fp = require('lodash/fp')

const Users = {id: 'Users'}
const Auth = {id: 'Auth'}
const Rooms = {id: 'Rooms'}
const Houses = {id: 'Houses'}
const Building = {id: 'Building'}
const GeoLocation = {id: 'GeoLocation'}
const Contracts = {id: 'Contracts'}
const HouseDevices = {id: 'HouseDevices'}

describe('Common', function() {
  before(() => {
    global.Typedef = Include('/libs/typedef')
    global.log = console
    global.SnowFlake = {next: () => 998811}
    global.SequelizeModels = {
      Users,
      Auth,
      Rooms,
      Houses,
      Building,
      GeoLocation,
      Contracts,
      HouseDevices,
    }
  })
  describe('includeContract', () => {
    it('should provide contracts condition', function() {
      const contractFilter = includeContracts(global.SequelizeModels)
      const contractOptions = contractFilter('')
      contractOptions.should.be.eql({
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
                    required: true,
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
                required: true,
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
            required: true,
            paranoid: false,
            model: Rooms,
          },
        ],
        model: Contracts,
        where: {
          status: 'ONGOING',
        },
      })
    })
    it('should consider houseFormat parameter', function() {
      const contractFilter = includeContracts(global.SequelizeModels)
      const contractOptions = contractFilter('SHARE')
      contractOptions.should.be.eql({
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
                where: {
                  houseFormat: 'SHARE',
                },
                include: [
                  {
                    as: 'building',
                    attributes: [
                      'building',
                      'unit',
                    ],
                    required: true,
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
                required: true,
                paranoid: false,
              },
              {
                model: HouseDevices,
                as: 'devices',
                attributes: ['deviceId'],
                required: false,
              },
            ],
            required: true,
            model: Rooms,
            paranoid: false,
          },
        ],
        model: Contracts,
        where: {
          status: 'ONGOING',
        },
      })
    })
    it('should consider location condition', function() {
      const contractFilter = includeContracts(global.SequelizeModels)
      const contractOptions = contractFilter('', {},
        {where: {id: 'locationId'}})
      contractOptions.should.be.eql({
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
                    required: true,
                    include: [
                      {
                        as: 'location',
                        attributes: [
                          'name',
                        ],
                        model: GeoLocation,
                        paranoid: false,
                        where: {id: 'locationId'},
                      },
                    ],
                    model: Building,
                    paranoid: false,
                  },
                ],
                model: Houses,
                required: true,
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
            required: true,
            model: Rooms,
            paranoid: false,
          },
        ],
        model: Contracts,
      })
    })
  })

  describe('default', () => {
    it('should include terminated contracts if contract status is overridden',
      function() {
        const contractFilter = includeContracts(global.SequelizeModels)
        const contractOptions = contractFilter('', {})
        contractOptions.should.be.eql({
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
                      required: true,
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
                  where: {},
                  required: true,
                  paranoid: false,
                },
                {
                  model: HouseDevices,
                  as: 'devices',
                  attributes: ['deviceId'],
                  required: false,
                },
              ],
              required: true,
              model: Rooms,
              paranoid: false,
            },
          ],
          model: Contracts,
        })
      })
    it('should consider houseFormat if provided', function() {
      const contractFilter = includeContracts(global.SequelizeModels)
      const contractOptions = contractFilter('SOLE', {})
      contractOptions.should.be.eql({
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
                    required: true,
                  },
                ],
                model: Houses,
                where: {
                  houseFormat: 'SOLE',
                },
                required: true,
                paranoid: false,
              },
              {
                model: HouseDevices,
                as: 'devices',
                attributes: ['deviceId'],
                required: false,
              },
            ],
            required: true,
            model: Rooms,
            paranoid: false,
          },
        ],
        model: Contracts,
      })
    })

    it('should return Ok if no bill is passed in', async () => {
      const bills = []
      const result = await payBills(global.MySQL)(bills)
      result.should.be.eql(
        ErrorCode.ack(ErrorCode.OK, {message: 'No bills were paid.'}))
    })

    it('should be able to pay bills successfully', async () => {
      const commit = spy()
      const rollback = spy()
      global.MySQL = {
        BillPayment: {
          bulkCreate: async () => ({}),
        },
        Flows: {
          bulkCreate: async () => ({}),
        },
        Sequelize: {
          transaction: async () => ({
            commit,
            rollback,
          }),
        },
        FundChannelFlows: {
          bulkCreate: async () => ({}),
        },
        Users: {
          findById: async () => ({toJSON: () => null}),
        },
      }

      const bills = [{dataValues: {userId: 112}}]
      const projectId = 1000
      const fundChannel = {
        id: 1,
        serviceCharge: [
          {
            type: 'BILL',
          }],
      }
      const userId = 2312
      const orderNo = 311212
      const category = 'BILL'
      const result = await payBills(global.MySQL)(bills, projectId,
        fundChannel, userId, orderNo, category)
      result.should.be.eql(ErrorCode.ack(ErrorCode.OK))
    })

    it('should calculate charge base on fundChannel', () => {
      const chargeObj = serviceCharge({
        serviceCharge: [
          {
            type: 'BILL',
            strategy: {fee: 10, user: 20, project: 80},
          }],
      }, 1000)
      chargeObj.should.be.eql({
        amount: 1000,
        amountForBill: 1002,
        shareAmount: 10,
        share: {
          user: 2,
          project: 8,
        },
      })
    })

    it('should calculate 0 charge if no service charge in fundChannel',
      () => {
        serviceCharge({}, 100).should.be.eql({
          amount: 100,
          amountForBill: 100,
          shareAmount: 0,
        })
      })
  })

  describe('moveFundChannelToRoot', () => {
    it('should pick serviceCharge and other attributes from result',
      async function() {
        moveFundChannelToRoot(
          {
            toJSON: () => ({id: 99}),
            fundChannel: {aField: 1, serviceCharge: 2, notMe: 3},
          },
        )(['aField']).
          should.
          be.
          eql({id: 99, serviceCharge: 2, aField: 1})
      })

    it('should return empty if result is empty', async function() {
      moveFundChannelToRoot({toJSON: () => ({})})([]).should.be.eql({})
    })
  })

  describe('shareFlows', () => {
    it('should be able to create according to serviceCharge',
      async function() {
        const serviceCharge = {
          share: {
            user: 10,
            project: 90,
          },
        }
        const orderNo = 321
        const projectId = 100
        const userId = 999
        const billId = 111
        const fundChannel = {id: 345}
        shareFlows(serviceCharge, orderNo, projectId, userId, billId,
          fundChannel).should.be.eql([
          {
            amount: 10,
            billId,
            category: 'SCTOPUP',
            from: userId,
            fundChannelId: 345,
            id: 998811,
            orderNo,
            projectId,
            to: 1,
          },
          {
            amount: 90,
            billId,
            category: 'SCTOPUP',
            from: projectId,
            fundChannelId: 345,
            id: 998811,
            orderNo,
            projectId,
            to: 1,
          },
        ])
      })

    it('should be empty by default', async function() {
      shareFlows().should.be.eql([])
    })

  })

  describe('topUp', () => {
    it('should be able to top up user account',
      async function() {
        const createSpy = stub().resolves({})
        global.MySQL = {
          CashAccount: {
            findOne: async () => ({id: 123, balance: 100}),
            update: async () => [{id: 123}],
          },
          Flows: {
            create: async () => ({id: 123}),
          },
          UserNotifications: {
            create: async () => ({}),
          },
          FundChannelFlows: {
            bulkCreate: async () => ({}),
          },
          Topup: {
            create: createSpy,
          },
          Users: {
            findById: async () => ({
              toJSON: () => ({
                id: 123,
                auth: {projectId: 1},
              }),
            }),
          },
          Sequelize: {
            transaction: async () => ({commit: fp.noop}),
          },
          Literal: () => 1,
        }

        const projectId = 100
        const userId = 999
        const contractId = 111
        const fundChannel = {id: 345}
        await topUp(fundChannel, projectId, userId, 'operatorId',
          contractId,
          19999).then(res => {
          res.should.be.eql({
            code: 0,
            message: '',
            result: {balance: 20099, amount: 19999, userId: 999},
          })
          createSpy.should.have.been.called
          createSpy.getCall(0).args[0].fundChannelId.should.be.equal(
            345)
        })
      })

  })

  describe('platformFlows', () => {
    it('should be able to create according to serviceCharge & fundChannel',
      async function() {
        const serviceCharge = {
          fee: 99,
        }
        const orderNo = 321
        const projectId = 100
        const userId = 999
        const billId = 111
        const fundChannel = {id: 345, fee: 100}
        platformFlows(serviceCharge, orderNo, projectId, userId, billId,
          fundChannel).should.be.eql([
          {
            amount: serviceCharge.fee,
            billId,
            category: 'COMMISSION',
            from: Typedef.PlatformId,
            fundChannelId: 345,
            id: 998811,
            orderNo,
            projectId,
            to: 0,
          },
        ])
      })
  })

  describe('logFlows', () => {
    it('should be able to create sub flows for BILL',
      async function() {
        const serviceCharge = {
          amountForBill: 1000,
          fee: 99,
        }
        const orderNo = 321
        const projectId = 100
        const userId = 999
        const billId = 111
        const fundChannel = {id: 345, fee: 100}
        const t = {id: 't'}
        const category = 'BILL'
        const createStub = stub().resolves({})
        const Models = {
          FundChannelFlows: {
            bulkCreate: createStub,
          },
        }
        await logFlows(Models)(serviceCharge, orderNo, projectId,
          userId, billId, fundChannel, t, category).then(() => {
          createStub.should.have.been.called
          createStub.getCall(0).args[0].should.be.eql([

            {
              amount: 1000,
              billId,
              category: 'BILL',
              from: 0,
              fundChannelId: fundChannel.id,
              id: 998811,
              orderNo,
              projectId,
              to: userId,
            },
            {
              amount: 99,
              billId: 111,
              category: 'COMMISSION',
              from: 1,
              fundChannelId: fundChannel.id,
              id: 998811,
              orderNo,
              projectId,
              to: 0,
            },
          ])
        })

      })
    it('should be able to create sub flows for TOPUP',
      async function() {
        const serviceCharge = {
          amount: 1000,
          fee: 99,
        }
        const orderNo = 321
        const projectId = 100
        const userId = 999
        const billId = 111
        const fundChannel = {id: 345, fee: 100}
        const t = {id: 't'}
        const category = 'TOPUP'
        const createStub = stub().resolves({})
        const Models = {
          FundChannelFlows: {
            bulkCreate: createStub,
          },
        }
        await logFlows(Models)(serviceCharge, orderNo, projectId,
          userId, billId, fundChannel, t, category).then(() => {
          createStub.should.have.been.called
          createStub.getCall(0).args[0].should.be.eql([
            {
              amount: 1000,
              billId,
              category: 'TOPUP',
              from: 0,
              fundChannelId: fundChannel.id,
              id: 998811,
              orderNo,
              projectId,
              to: userId,
            },
            {
              amount: 99,
              billId: 111,
              category: 'COMMISSION',
              from: 1,
              fundChannelId: fundChannel.id,
              id: 998811,
              orderNo,
              projectId,
              to: 0,
            },
          ])
        })

      })
  })

  describe('convertRoomNumber', () => {
    it('when index is 1 then output should be  A',
      async function() {
        const roomNumber = convertRoomNumber(1)
        roomNumber.should.be.eql('A')
      },
    )

    it('when index is 26 then output should be AB',
      async function() {
        const roomNumber = convertRoomNumber(26)
        roomNumber.should.be.eql('AB')
      },
    )

    it('when index is 53 then output should be AAE',
      async function() {
        const roomNumber = convertRoomNumber(53)
        roomNumber.should.be.eql('AAE')
      },
    )
  })

  describe('translateDevices', () => {
    it('should retain memo of devices', async () => {
      const updatedAt = moment().subtract(1, 'm')
      const after = translateDevices([
        {
          public: '0',
          device: {
            freq: 600,
            deviceId: 'deviceId',
            memo: 'a memo',
            name: 'title',
            channels: [
              {
                scale: 100,
              }],
            type: 'type',
            updatedAt,
          },
        }])
      after.should.be.eql([
        {
          deviceId: 'deviceId',
          memo: 'a memo',
          public: '0',
          title: 'title',
          scale: 0.01,
          type: 'type',
          updatedAt: updatedAt.unix(),
          status: {
            service: 'EMC_ONLINE',
          },
        }])
    },
    )

    it('should consider devices last update time as status', async () => {
      const updatedAt = moment().subtract(1, 'd')
      const after = translateDevices([
        {
          public: '0',
          device: {
            freq: 1,
            deviceId: 'deviceId',
            memo: 'a memo',
            name: 'title',
            channels: [
              {
                scale: 100,
              }],
            type: 'type',
            updatedAt,
          },
        }])
      after.should.be.eql([
        {
          deviceId: 'deviceId',
          memo: 'a memo',
          public: '0',
          title: 'title',
          scale: 0.01,
          type: 'type',
          updatedAt: updatedAt.unix(),
          status: {
            service: 'EMC_OFFLINE',
          },
        }])
    },
    )

    it('should ignore objects has no devices', async () => {
      const after = translateDevices([{}])
      after.should.be.eql([])
    },
    )

    it('should handle empty devices', async () => {
      const after = translateDevices([])
      after.should.be.eql([])
    },
    )
  })

  describe('Util', () => {
    it('should extract address id from deviceId', () => {
      getAddrId('HX017062600064').should.be.equal('017062600064')
      getAddrId('YTL043000101501').should.be.equal('043000101501')
    })

    it('should extract building id from deviceId', () => {
      getBuildingId('HX017062600064').should.be.equal('0170626000')
      getBuildingId('YTL043000101501').should.be.equal('0430001015')
    })
  })

  describe('translateRooms', () => {
    it('should translate rooms into list', () => {
      translateRooms({orientation: 'S'})([
        {
          contracts: [
            {
              id: 1, from: 2, to: 3, contractNumber: 'contractNumber',
              strategy: {
                freq: {
                  rent: 1500,
                },
              },
              user: {
                id: 4, name: 'name',
              },
            }],
          devices: [
            {
              public: false,
              device: {
                deviceId: 123,
                updatedAt: 13200000000,
                type: 'type',
                name: 'title',
                channels: [{scale: 999000}],
                memo: 'memo',
              },
            }],
          suspendingRooms: [{id: 444}],
        }]).should.be.eql([
        {
          contract: {
            id: 1,
            from: 2,
            to: 3,
            contractNumber: 'contractNumber',
            rent: 1500,
            userId: 4,
            name: 'name',
          },
          devices: [
            {
              public: false,
              deviceId: 123,
              updatedAt: 13200000,
              type: 'type',
              title: 'title',
              scale: 99.9,
              memo: 'memo',
              status: {
                service: 'EMC_OFFLINE'
              }
            }],
          orientation: 'S',
          status: 'IDLE',
          suspending: {id: 444},
        }])
    })

    it('should be able to handle empty', () => {
      translateRooms({orientation: 'S'})([{}]).should.be.eql([
        {
          contract: {},
          devices: [],
          orientation: 'S',
          status: 'IDLE',
          suspending: {},
        }])
      translateRooms({orientation: 'S'})([]).should.be.eql([])
    })
  })
})