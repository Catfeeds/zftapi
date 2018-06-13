'use strict';

const {get} = require('../../services/v1.0/handlers/projects/:projectId/bills');
const {get: contractGet} = require(
  '../../services/v1.0/handlers/projects/:projectId/contracts/:contractId/bills');
require('include-node');
const {spy, stub} = require('sinon');
const fp = require('lodash/fp');
const {fn} = require('moment');
const sinon = require('sinon');

const sandbox = sinon.sandbox.create();

const stubRoom = {toJSON: () => ({house: {building: {location: {}}}})};

describe('Bills', function() {
  before(() => {
    global.Typedef = Include('/libs/typedef');
    global.ErrorCode = Include('/libs/errorCode');
    global.Util = Include('/libs/util');
    sandbox.stub(fn, 'unix');
    fn.unix.returns(20189999);
  });
  after(() => {
    sandbox.restore();
  });
  describe('Independent Bills', function() {
    it('should return all contracts from findAndCountAll',
      async function() {
        const bill = {dataValues: {contract: {dataValues: {room: stubRoom}}}};
        const req = {
          params: {
            projectId: 100,
          },
          query: {},

        };
        const Users = {id: 'Users'};
        const Rooms = {id: 'Rooms'};
        const Houses = {id: 'Houses'};
        const Building = {id: 'Building'};
        const GeoLocation = {id: 'GeoLocation'};
        const BillFlows = {id: 'BillFlows'};
        const Contracts = {id: 'Contracts'};
        global.MySQL = {
          Bills: {
            async findAndCountAll() {
              return {
                count: 1,
                rows: [bill],
              };
            },
          },
          Users,
          Rooms,
          Houses,
          Building,
          GeoLocation,
          BillFlows,
          Contracts,
        };
        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
          resSpy.should.have.been.called;
          resSpy.getCall(0).args[0].data[0].contract.should.be.eql(
            {});
          resSpy.getCall(0).args[0].data[0].user.should.be.eql({});
        },
        );
      });

    it('should connect with houses if query with houseFormat', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          houseFormat: 'SOLE',
        },
      };
      const sequelizeFindSpy = stub().resolves([]);
      const BillPayment = {id: 'BillPayment'};
      const Users = {id: 'Users'};
      const Auth = {id: 'Auth'};
      const Rooms = {id: 'Rooms'};
      const Houses = {id: 'Houses'};
      const Building = {id: 'Building'};
      const GeoLocation = {id: 'GeoLocation'};
      const BillFlows = {id: 'BillFlows'};
      const Contracts = {id: 'Contracts'};
      const FundChannelFlows = {id: 'FundChannelFlows'};
      const HouseDevices = {id: 'HouseDevices'};
      global.MySQL = {
        Bills: {
          findAndCountAll: sequelizeFindSpy,
        },
        Users,
        Auth,
        Rooms,
        Houses,
        Building,
        GeoLocation,
        BillFlows,
        BillPayment,
        Contracts,
        FundChannelFlows,
        HouseDevices,
      };

      await get(req, {send: fp.noop}).then(() => {
        sequelizeFindSpy.should.have.been.called;
        const modelOptions = sequelizeFindSpy.getCall(0).args[0];
        modelOptions.include.should.be.eql([
          {
            as: 'billItems',
            attributes: [
              'configId',
              'amount',
              'createdAt',
              'id',
            ],
            required: true,
            model: BillFlows,
          }, {
            as: 'payments',
            attributes: [
              'id',
              'amount',
              'fundChannelId',
              'operator',
              'paidAt',
              'remark',
              'status',
            ],
            model: BillPayment,
            required: false,
          },
          {
            include: [
              {
                model: Users,
                include: [
                  {
                    model: Auth,
                    attributes: ['mobile'],
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
                    paranoid: false,
                    required: true,
                    where: {
                      houseFormat: 'SOLE',
                    },
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
          },
          {
            attributes: [
              'id',
              'fundChannelId',
              'category',
              'orderNo',
              'from',
              'to',
              'amount',
              'createdAt',
            ],
            model: FundChannelFlows,
            required: false,
          }]);
      });
    });
    it('should filter out unPaid bill if paid=true', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          houseFormat: 'SOLE',
          paid: 'true',
        },
      };
      const sequelizeFindSpy = stub().resolves([]);
      const BillPayment = {id: 'BillPayment'};
      const Users = {id: 'Users'};
      const Rooms = {id: 'Rooms'};
      const Houses = {id: 'Houses'};
      const Building = {id: 'Building'};
      const GeoLocation = {id: 'GeoLocation'};
      const BillFlows = {id: 'BillFlows'};
      const Contracts = {id: 'Contracts'};
      const FundChannelFlows = {id: 'FundChannelFlows'};
      global.MySQL = {
        Bills: {
          findAndCountAll: sequelizeFindSpy,
        },
        Users,
        Rooms,
        Houses,
        Building,
        GeoLocation,
        BillFlows,
        BillPayment,
        Contracts,
        FundChannelFlows,
        Sequelize: {
          literal: fp.identity,
        },
      };

      await get(req, {send: fp.noop}).then(() => {
        sequelizeFindSpy.should.have.been.called;
        const modelOptions = sequelizeFindSpy.getCall(0).args[0];
        fp.omit('$or')(modelOptions.where).should.be.eql({
          entityType: 'property',
          id: {
            $in: '( select billId from billpayment where projectId = 100 )',
          },
          projectId: 100,
        });
      });
    });
    it('should display related bills only', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {},
      };
      const sequelizeFindSpy = stub().resolves([]);
      const BillPayment = {id: 'BillPayment'};
      const Users = {id: 'Users'};
      const Rooms = {id: 'Rooms'};
      const Houses = {id: 'Houses'};
      const Building = {id: 'Building'};
      const GeoLocation = {id: 'GeoLocation'};
      const BillFlows = {id: 'BillFlows'};
      const Contracts = {id: 'Contracts'};
      const FundChannelFlows = {id: 'FundChannelFlows'};
      global.MySQL = {
        Bills: {
          findAndCountAll: sequelizeFindSpy,
        },
        Users,
        Rooms,
        Houses,
        Building,
        GeoLocation,
        BillFlows,
        BillPayment,
        Contracts,
        FundChannelFlows,
        Sequelize: {
          literal: fp.identity,
        },
      };

      await get(req, {send: fp.noop}).then(() => {
        sequelizeFindSpy.should.have.been.called;
        const modelOptions = sequelizeFindSpy.getCall(0).args[0];
        modelOptions.where.$or.should.be.eql([
          {
            startDate: {
              $lt: 20189999,
            },
          }, {
            dueDate: {
              $lt: 20189999,
            },
          }]);
      });
    });
    it('should respect from & to query', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          from: 123,
          to: 234,
        },
      };
      const sequelizeFindSpy = stub().resolves([]);
      const BillPayment = {id: 'BillPayment'};
      const Users = {id: 'Users'};
      const Rooms = {id: 'Rooms'};
      const Houses = {id: 'Houses'};
      const Building = {id: 'Building'};
      const GeoLocation = {id: 'GeoLocation'};
      const BillFlows = {id: 'BillFlows'};
      const Contracts = {id: 'Contracts'};
      const FundChannelFlows = {id: 'FundChannelFlows'};
      global.MySQL = {
        Bills: {
          findAndCountAll: sequelizeFindSpy,
        },
        Users,
        Rooms,
        Houses,
        Building,
        GeoLocation,
        BillFlows,
        BillPayment,
        Contracts,
        FundChannelFlows,
        Sequelize: {
          literal: fp.identity,
        },
      };

      await get(req, {send: fp.noop}).then(() => {
        sequelizeFindSpy.should.have.been.called;
        const modelOptions = sequelizeFindSpy.getCall(0).args[0];
        modelOptions.where.dueDate.should.be.eql({
          $gte: req.query.from,
          $lte: req.query.to,
        });
      });
    });
    it('should respect manager query', async () => {
      const req = {
        params: {
          projectId: 100,
        },
        query: {
          manager: 321,
        },
      };
      const sequelizeFindSpy = stub().resolves([]);
      const BillPayment = {id: 'BillPayment'};
      const Users = {id: 'Users'};
      const Rooms = {id: 'Rooms'};
      const Houses = {id: 'Houses'};
      const Building = {id: 'Building'};
      const GeoLocation = {id: 'GeoLocation'};
      const BillFlows = {id: 'BillFlows'};
      const Contracts = {id: 'Contracts'};
      const FundChannelFlows = {id: 'FundChannelFlows'};
      global.MySQL = {
        Bills: {
          findAndCountAll: sequelizeFindSpy,
        },
        Users,
        Rooms,
        Houses,
        Building,
        GeoLocation,
        BillFlows,
        BillPayment,
        Contracts,
        FundChannelFlows,
        Sequelize: {
          literal: fp.identity,
        },
      };

      await get(req, {send: fp.noop}).then(() => {
        sequelizeFindSpy.should.have.been.called;
        const modelOptions = sequelizeFindSpy.getCall(0).args[0];
        modelOptions.where['$contract.room.house.houseKeeper$'].should.be.eql(
          req.query.manager,
        );
      });
    });
  });
  describe('Contracts Bills', function() {
    it('should filter out unPaid bill in contracts/bills', async () => {
      const req = {
        params: {
          projectId: 100,
          contractId: 999,
        },
        query: {
          houseFormat: 'SOLE',
          paid: 'true',
        },
      };
      const sequelizeFindSpy = stub().resolves([]);
      const BillPayment = {id: 'BillPayment'};
      const Users = {id: 'Users'};
      const Rooms = {id: 'Rooms'};
      const Houses = {id: 'Houses'};
      const Building = {id: 'Building'};
      const GeoLocation = {id: 'GeoLocation'};
      const BillFlows = {id: 'BillFlows'};
      const Contracts = {id: 'Contracts'};
      const FundChannelFlows = {id: 'FundChannelFlows'};
      global.MySQL = {
        Bills: {
          findAll: sequelizeFindSpy,
        },
        Users,
        Rooms,
        Houses,
        Building,
        GeoLocation,
        BillFlows,
        BillPayment,
        Contracts,
        FundChannelFlows,
        Sequelize: {
          literal: fp.identity,
        },
      };

      await contractGet(req, {send: fp.noop}).then(() => {
        sequelizeFindSpy.should.have.been.called;
        const modelOptions = sequelizeFindSpy.getCall(0).args[0];
        fp.omit('startDate')(modelOptions.where).should.be.eql({
          entityType: 'property',
          id: {
            $in: '( select billId from billpayment where projectId = 100 )',
          },
          projectId: 100,
          contractId: 999,
          $or: [
            {
              startDate: {
                $lt: 20189999,
              },
            }, {
              dueDate: {
                $lt: 20189999,
              },
            }],
        });
      });
    });
  });
});