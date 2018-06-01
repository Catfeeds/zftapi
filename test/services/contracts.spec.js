'use strict';

const {get, post} = require(
    '../../services/v1.0/handlers/projects/:projectId/contracts');
require('include-node');
const {spy, stub, sandbox} = require('sinon');
const fp = require('lodash/fp');
const {fn} = require('moment');

const room = {toJSON: () => ({house: {building: {location: {}}}})};
const expectedRoom = {
    devices: [],
};
const user = {toJSON: () => ({auth: {username: 'u', id: 123, mobile: '321'}})};
const expectedUser = {accountName: 'u', id: 123, mobile: '321'};

const sandboxIns = sandbox.create();

const defaultSequelizeModels = {
    Building: {id: 'Building'},
    GeoLocation: {id: 'GeoLocation'},
    HouseDevices: {id: 'HouseDevices'},
};

describe('Contracts', function() {
    before(() => {
        global.Typedef = Include('/libs/typedef');
        global.ErrorCode = Include('/libs/errorCode');
        global.Util = Include('/libs/util');
        global.SnowFlake = {next: fp.constant(1)};
    });
    afterEach(() => {
        sandboxIns.restore();
    });
    it('should return all contracts from findAndCountAll', async function() {
        const contract = {
            dataValues: {
                expenses: '[]',
                strategy: '{}',
                room,
                user,
            },
        };
        const req = {
            params: {
                projectId: 100,
            },
            query: {},

        };
        global.MySQL = {
            Contracts: {
                async findAndCountAll() {
                    return {
                        count: 1,
                        rows: [contract],
                    };
                },
            },
        };
        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
            resSpy.should.have.been.called;
            resSpy.getCall(0).args[0].data.should.be.eql(
                [
                    {
                        expenses: [],
                        strategy: {},
                        room: expectedRoom,
                        user: expectedUser,
                    }]);
        });
    });

    it('should omit createdAt, updatedAt fields', async function() {
        const req = {
            params: {
                projectId: 100,
            },
            query: {},
        };
        global.MySQL = {
            Contracts: {
                async findAndCountAll() {
                    return {
                        count: 1,
                        rows: [
                            {
                                dataValues: {
                                    id: 1,
                                    createdAt: 2,
                                    updatedAt: 3,
                                    userId: 123,
                                    andMe: 'haha',
                                    expenses: '[]',
                                    strategy: '{}',
                                    room,
                                    user,
                                },
                            }],
                    };
                },
            },
        };
        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
            resSpy.should.have.been.called;
            resSpy.getCall(0).args[0].data.should.be.eql([
                {
                    id: 1,
                    andMe: 'haha',
                    expenses: [],
                    strategy: {},
                    userId: 123,
                    room: expectedRoom,
                    user: expectedUser,
                }]);
        });
    });

    it('should omit null value fields', async function() {
        const req = {
            params: {
                projectId: 100,
            },
            query: {},
        };
        global.MySQL = {
            Contracts: {
                async findAndCountAll() {
                    return {
                        count: 1,
                        rows: [
                            {
                                dataValues: {
                                    nullField1: null,
                                    nullField2: null,
                                    onlyMe: 'haha',
                                    expenses: '[]',
                                    strategy: '{}',
                                    room,
                                    user,
                                },
                            }],
                    };
                },
            },
        };
        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
            resSpy.should.have.been.called;
            resSpy.getCall(0).args[0].data[0].onlyMe.should.be.eql('haha');
        });
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
        const CashAccount = {id: 'CashAccount'};
        const Users = {id: 'Users'};
        const Auth = {id: 'Auth'};
        const Rooms = {id: 'Rooms'};
        const Houses = {id: 'Houses'};
        const Building = {id: 'Building'};
        const GeoLocation = {id: 'GeoLocation'};
        const HouseDevices = {id: 'HouseDevices'};
        global.MySQL = {
            Contracts: {
                findAndCountAll: sequelizeFindSpy,
            },
            Users,
            Auth,
            Rooms,
            Houses,
            Building,
            GeoLocation,
            CashAccount,
            HouseDevices,
        };

        await get(req, {send: fp.noop}).then(() => {
            sequelizeFindSpy.should.have.been.called;
            const modelOptions = sequelizeFindSpy.getCall(0).args[0];
            modelOptions.include.should.be.eql([
                {
                    model: Users, 'required': true,
                    include: [
                        {
                            as: 'cashAccount',
                            attributes: ['balance'],
                            model: CashAccount,
                        }, {
                            attributes: ['id', 'username', 'mobile'],
                            model: Auth,
                        },
                    ],
                },
                {
                    model: Rooms,
                    required: true,
                    paranoid: false,
                    attributes: ['id', 'name', 'houseId'],
                    include: [
                        {
                            model: Houses,
                            as: 'house',
                            attributes: [
                                'id',
                                'roomNumber',
                                'buildingId',
                                'houseKeeper',],
                            where: {
                                houseFormat: 'SOLE',
                            },
                            required: true,
                            paranoid: false,
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
                                        }],
                                    model: Building,
                                    required: true,
                                    paranoid: false,
                                }],
                        },
                        {
                            model: HouseDevices,
                            as: 'devices',
                            attributes: ['deviceId'],
                            required: false,
                        }],
                }]);
        });
    });

    it('should check room availability while creating contract',
        async () => {
            const req = {
                params: {
                    projectId: 100,
                },
                body: {
                    from: 1000,
                    to: 2000,
                    user: {
                        mobile: '',
                    },
                    roomId: 321,
                    strategy: {
                        freq: {
                            rent: 1,
                        },
                        bond: 1,
                    },
                },
            };
            const sequelizeCountSpy = stub().resolves(1);
            const sendSpy = spy();
            const Users = {id: 'Users', findOrCreate: async () => [{id: 1999}]};
            const Auth = {
                id: 'Auth',
                findOrCreate: async () => [{id: 2999}],
                count: async () => 0,
            };
            const CashAccount = {
                findOrCreate: async () => ([
                    {
                        id: 321,
                        userId: 1999,
                    }]),
            };
            const Bills = {id: 'Bills', create: async () => ({})};

            global.MySQL = {
                ... defaultSequelizeModels,
                Contracts: {
                    count: sequelizeCountSpy,
                    create: async () => req.body,
                },
                Bills,
                CashAccount,
                Users,
                Rooms: {
                    id: 'Rooms',
                    findById: async (roomId) => ({id: roomId})
                },
                Sequelize: {
                    transaction: async func => func({}),
                },
                Auth,
            };

            await post(req, {send: sendSpy}).then(() => {
                sequelizeCountSpy.should.have.been.called;
                const countingOption = sequelizeCountSpy.getCall(0).args[0];
                countingOption.where.should.be.eql({
                    roomId: req.body.roomId,
                    status: 'ONGOING',
                    $or: [
                        {
                            from: {
                                $lte: req.body.from,
                            },
                            to: {
                                $gte: req.body.from,
                            },
                        }, {
                            from: {
                                $lte: req.body.to,
                            },
                            to: {
                                $gte: req.body.to,
                            },
                        }],
                });
                sendSpy.getCall(0).args[1].should.be.eql({
                    code: 21000009,
                    message: '房间已出租',
                    result: {
                        error: 'room 321 is unavailable.',
                    }
                });
            });
        });
    it('should detect room existence while creating contract',
        async () => {
            const req = {
                params: {
                    projectId: 100,
                },
                body: {
                    from: 1000,
                    to: 2000,
                    user: {
                        mobile: '',
                    },
                    roomId: 321,
                    strategy: {
                        freq: {
                            rent: 1,
                        },
                        bond: 1,
                    },
                },
            };
            const sequelizeCountSpy = stub().resolves(0);
            const sendSpy = spy();
            const Users = {id: 'Users', findOrCreate: async () => [{id: 1999}]};
            const Auth = {
                id: 'Auth',
                findOrCreate: async () => [{id: 2999}],
                count: async () => 0,
            };
            const CashAccount = {
                findOrCreate: async () => ([
                    {
                        id: 321,
                        userId: 1999,
                    }]),
            };
            const Houses = {id: 'Houses'};
            const Bills = {id: 'Bills', create: async () => ({})};
            const Building = {id: 'Building'};
            const GeoLocation = {id: 'GeoLocation'};
            const HouseDevices = {id: 'HouseDevices'};
            global.MySQL = {
                Contracts: {
                    count: sequelizeCountSpy,
                    create: async () => req.body,
                },
                Bills,
                CashAccount,
                Users,
                Rooms: {
                    id: 'Rooms',
                    findById: async () => null,
                },
                Houses,
                Building,
                GeoLocation,
                HouseDevices,
                Sequelize: {
                    transaction: async func => func({}),
                },
                Auth,
            };

            await post(req, {send: sendSpy}).then(() => {
                sequelizeCountSpy.should.have.been.called;
                const countingOption = sequelizeCountSpy.getCall(0).args[0];
                countingOption.where.should.be.eql({
                    roomId: req.body.roomId,
                    status: 'ONGOING',
                    $or: [
                        {
                            from: {
                                $lte: req.body.from,
                            },
                            to: {
                                $gte: req.body.from,
                            },
                        }, {
                            from: {
                                $lte: req.body.to,
                            },
                            to: {
                                $gte: req.body.to,
                            },
                        }],
                });
                sendSpy.getCall(0).args[1].should.be.eql({
                    code: 21000006,
                    message: '房间不存在',
                    result: {
                        error: 'room 321 doesn\'t exist.',
                    },
                });
            });
        });

    it('should allow to filter contracts by leasing status', async function() {
        const req = {
            params: {
                projectId: 100,
            },
            query: {
                leasingStatus: 'waiting',
            },
        };

        sandboxIns.stub(fn, 'unix');
        fn.unix.returns(2018);

        const sequelizeFindSpy = stub().resolves([]);
        const CashAccount = {id: 'CashAccount'};
        const Users = {id: 'Users'};
        const Rooms = {id: 'Rooms'};
        const Houses = {id: 'Houses'};
        const Building = {id: 'Building'};
        const GeoLocation = {id: 'GeoLocation'};
        const HouseDevices = {id: 'HouseDevices'};
        global.MySQL = {
            Contracts: {
                findAndCountAll: sequelizeFindSpy,
            },
            Users,
            Rooms,
            Houses,
            Building,
            GeoLocation,
            CashAccount,
            HouseDevices,
        };
        await get(req, {send: fp.noop}).then(() => {
            sequelizeFindSpy.should.have.been.called;
            const modelOptions = sequelizeFindSpy.getCall(0).args[0];
            modelOptions.where.should.be.eql({
                from: {
                    $gt: 2018,
                },
                projectId: 100,
                status: 'ONGOING',
            });
        });
    });

    it('should allow to filter contracts if leasing status is overdue',
        async function() {
            const req = {
                params: {
                    projectId: 100,
                },
                query: {
                    leasingStatus: 'overdue',
                },
            };

            sandboxIns.stub(fn, 'unix');
            fn.unix.returns(2018);

            const sequelizeFindSpy = stub().resolves([]);
            const CashAccount = {id: 'CashAccount'};
            const Users = {id: 'Users'};
            const Rooms = {id: 'Rooms'};
            const Houses = {id: 'Houses'};
            const Building = {id: 'Building'};
            const GeoLocation = {id: 'GeoLocation'};
            const HouseDevices = {id: 'HouseDevices'};
            global.MySQL = {
                Contracts: {
                    findAndCountAll: sequelizeFindSpy,
                },
                Users,
                Rooms,
                Houses,
                Building,
                GeoLocation,
                CashAccount,
                HouseDevices,
            };
            await get(req, {send: fp.noop}).then(() => {
                sequelizeFindSpy.should.have.been.called;
                const modelOptions = sequelizeFindSpy.getCall(0).args[0];
                modelOptions.where.should.be.eql({
                    to: {
                        $lt: 2018,
                    },
                    projectId: 100,
                    status: 'ONGOING',
                });
            });
        });

    it('should allow to filter contracts if leasing status is leasing',
        async function() {
            const req = {
                params: {
                    projectId: 100,
                },
                query: {
                    leasingStatus: 'leasing',
                },
            };

            sandboxIns.stub(fn, 'unix');
            fn.unix.returns(2018);

            const sequelizeFindSpy = stub().resolves([]);
            const CashAccount = {id: 'CashAccount'};
            const Users = {id: 'Users'};
            const Rooms = {id: 'Rooms'};
            const Houses = {id: 'Houses'};
            const Building = {id: 'Building'};
            const GeoLocation = {id: 'GeoLocation'};
            const HouseDevices = {id: 'HouseDevices'};
            global.MySQL = {
                Contracts: {
                    findAndCountAll: sequelizeFindSpy,
                },
                Users,
                Rooms,
                Houses,
                Building,
                GeoLocation,
                CashAccount,
                HouseDevices,
            };
            await get(req, {send: fp.noop}).then(() => {
                sequelizeFindSpy.should.have.been.called;
                const modelOptions = sequelizeFindSpy.getCall(0).args[0];
                modelOptions.where.should.be.eql({
                    from: {
                        $lt: 2018,
                    },
                    to: {
                        $gt: 2018,
                    },
                    projectId: 100,
                    status: 'ONGOING',
                });
            });
        });
    it('should allow to order by balance', async () => {
        const req = {
            params: {
                projectId: 100,
            },
            query: {
                orderField: 'balance',
                order: 'ASC',
            },
        };

        const sequelizeFindSpy = stub().resolves([]);
        const CashAccount = {id: 'CashAccount'};
        const Users = {id: 'Users'};
        const Rooms = {id: 'Rooms'};
        const Houses = {id: 'Houses'};
        const Building = {id: 'Building'};
        const GeoLocation = {id: 'GeoLocation'};
        const HouseDevices = {id: 'HouseDevices'};
        global.MySQL = {
            Contracts: {
                findAndCountAll: sequelizeFindSpy,
            },
            Users,
            Rooms,
            Houses,
            Building,
            GeoLocation,
            CashAccount,
            HouseDevices,
        };
        await get(req, {send: fp.noop}).then(() => {
            sequelizeFindSpy.should.have.been.called;
            const modelOptions = sequelizeFindSpy.getCall(0).args[0];
            modelOptions.order.should.be.eql([
                [
                    Users,
                    {
                        as: 'cashAccount',
                        model: CashAccount,
                    },
                    'balance',
                    'ASC',
                ],
                [
                    'createdAt',
                    'DESC',
                ],
            ]);
        });
    });

    it('should allow to filter by manager', async () => {
        const req = {
            params: {
                projectId: 100,
            },
            query: {
                manager: 333,
            },
        };

        const sequelizeFindSpy = stub().resolves([]);
        const CashAccount = {id: 'CashAccount'};
        const Users = {id: 'Users'};
        const Rooms = {id: 'Rooms'};
        const Houses = {id: 'Houses'};
        const Building = {id: 'Building'};
        const GeoLocation = {id: 'GeoLocation'};
        const HouseDevices = {id: 'HouseDevices'};
        global.MySQL = {
            Contracts: {
                findAndCountAll: sequelizeFindSpy,
            },
            Users,
            Rooms,
            Houses,
            Building,
            GeoLocation,
            CashAccount,
            HouseDevices,
        };
        await get(req, {send: fp.noop}).then(() => {
            sequelizeFindSpy.should.have.been.called;
            const modelOptions = sequelizeFindSpy.getCall(0).args[0];
            modelOptions.where['$room.house.houseKeeper$'].should.be.eql(333);
        });
    });
    it('should allow to filter by balance sign', async () => {
        const req = {
            params: {
                projectId: 100,
            },
            query: {
                balance: 'positive',
            },
        };

        const sequelizeFindSpy = stub().resolves([]);
        const CashAccount = {id: 'CashAccount'};
        const Users = {id: 'Users'};
        const Rooms = {id: 'Rooms'};
        const Houses = {id: 'Houses'};
        const Building = {id: 'Building'};
        const GeoLocation = {id: 'GeoLocation'};
        const HouseDevices = {id: 'HouseDevices'};
        global.MySQL = {
            Contracts: {
                findAndCountAll: sequelizeFindSpy,
            },
            Users,
            Rooms,
            Houses,
            Building,
            GeoLocation,
            CashAccount,
            HouseDevices,
        };
        await get(req, {send: fp.noop}).then(() => {
            sequelizeFindSpy.should.have.been.called;
            const modelOptions = sequelizeFindSpy.getCall(0).args[0];
            modelOptions.where['$user.cashAccount.balance$'].should.be.eql({
                $gt: 0,
            });
        });
    });

    it('should allow to filter by q', async () => {
        const req = {
            params: {
                projectId: 100,
            },
            query: {
                q: 'some words',
            },
        };

        const sequelizeFindSpy = stub().resolves([]);
        const CashAccount = {id: 'CashAccount'};
        const Users = {id: 'Users'};
        const Rooms = {id: 'Rooms'};
        const Houses = {id: 'Houses'};
        const Building = {id: 'Building'};
        const GeoLocation = {id: 'GeoLocation'};
        const HouseDevices = {id: 'HouseDevices'};
        global.MySQL = {
            Contracts: {
                findAndCountAll: sequelizeFindSpy,
            },
            Users,
            Rooms,
            Houses,
            Building,
            GeoLocation,
            CashAccount,
            HouseDevices,
        };
        await get(req, {send: fp.noop}).then(() => {
            sequelizeFindSpy.should.have.been.called;
            const modelOptions = sequelizeFindSpy.getCall(0).args[0];
            modelOptions.where.should.be.eql({
                projectId: 100,
                $or: [
                    {
                        '$room.house.building.location.name$': {
                            $regexp: 'some words',
                        },
                    },
                    {
                        '$room.house.roomNumber$': {
                            $regexp: 'some words',
                        },
                    },
                    {
                        '$room.house.code$': {
                            $regexp: 'some words',
                        },
                    },
                    {
                        '$user.name$': {
                            $regexp: 'some words',
                        },
                    },
                    {
                        '$user.auth.mobile$': {
                            $regexp: 'some words',
                        },
                    },
                ],
                status: 'ONGOING',
            });
        });
    });

    it('should check from is less than to while creating contract',
        async () => {
            const req = {
                params: {
                    projectId: 100,
                },
                body: {
                    from: 2000,
                    to: 1000,
                    user: {accountName: '', mobile: ''},
                },
            };

            const Users = {id: 100, findOrCreate: async () => [{id: 1999}]};
            const Auth = {
                id: 'Auth',
                findOrCreate: async () => [{id: 2999}],
                count: async () => 0,
            };
            const CashAccount = {
                findOrCreate: async () => ([
                    {
                        id: 321,
                        userId: 1999,
                    }]),
            };
            const Rooms = {id: 'Rooms'};
            const Houses = {id: 'Houses'};
            const Building = {id: 'Building'};
            const GeoLocation = {id: 'GeoLocation'};
            const HouseDevices = {id: 'HouseDevices'};
            global.MySQL = {
                Contracts: {},
                CashAccount,
                Users,
                Rooms,
                Houses,
                Building,
                GeoLocation,
                HouseDevices,
                Auth,
                Sequelize: {
                    transaction: async func => func({}),
                },
            };
            const resSpy = spy();
            await post(req, {send: resSpy}).then(() => {
                resSpy.should.have.been.called;
                resSpy.getCall(0).args[0].should.be.eql(500);
                resSpy.getCall(0).args[1].result.should.be.eql(
                    {'error': 'Invalid contract time period : from 2000 to 1000.'});
            });
        });

    it('should check strategy rent amount while creating contract',
        async () => {
            const req = {
                params: {
                    projectId: 100,
                },
                body: {
                    strategy: {
                        freq: {
                            rent: 0,
                        },
                    },
                    from: 1000,
                    to: 2000,
                    user: {accountName: '', mobile: ''},
                },
            };

            const Users = {id: 100, findOrCreate: async () => [{id: 1999}]};
            const Auth = {
                id: 'Auth',
                findOrCreate: async () => [{id: 2999}],
                count: async () => 0,
            };
            const CashAccount = {
                findOrCreate: async () => ([
                    {
                        id: 321,
                        userId: 1999,
                    }]),
            };
            const Rooms = {id: 'Rooms'};
            const Houses = {id: 'Houses'};
            const Building = {id: 'Building'};
            const GeoLocation = {id: 'GeoLocation'};
            const HouseDevices = {id: 'HouseDevices'};
            global.MySQL = {
                Contracts: {},
                CashAccount,
                Users,
                Rooms,
                Auth,
                Houses,
                Building,
                GeoLocation,
                HouseDevices,
                Sequelize: {
                    transaction: async func => func({}),
                },
            };
            const resSpy = spy();
            await post(req, {send: resSpy}).then(() => {
                resSpy.should.have.been.called;
                resSpy.getCall(0).args[0].should.be.eql(500);
                resSpy.getCall(0).args[1].result.should.be.eql(
                    {'error': 'Invalid rent amount: 0, it must be greater than 0.'});
            });
        });

    it('should check bond amount while creating contract',
        async () => {
            const req = {
                params: {
                    projectId: 100,
                },
                body: {
                    strategy: {
                        freq: {
                            rent: 10,
                        },
                        bond: 0,
                    },
                    from: 1000,
                    to: 2000,
                    user: {accountName: '', mobile: ''},
                },
            };

            const Users = {id: 100, findOrCreate: async () => [{id: 1999}]};
            const Auth = {
                id: 'Auth',
                findOrCreate: async () => [{id: 2999}],
                count: async () => 0,
            };
            const CashAccount = {
                findOrCreate: async () => ([
                    {
                        id: 321,
                        userId: 1999,
                    }]),
            };
            const Rooms = {id: 'Rooms'};
            const Houses = {id: 'Houses'};
            const Building = {id: 'Building'};
            const GeoLocation = {id: 'GeoLocation'};
            const HouseDevices = {id: 'HouseDevices'};
            global.MySQL = {
                Contracts: {},
                CashAccount,
                Auth,
                Users,
                Rooms,
                Houses,
                Building,
                HouseDevices,
                GeoLocation,
                Sequelize: {
                    transaction: async func => func({}),
                },
            };
            const resSpy = spy();
            await post(req, {send: resSpy}).then(() => {
                resSpy.should.have.been.called;
                resSpy.getCall(0).args[0].should.be.eql(500);
                resSpy.getCall(0).args[1].result.should.be.eql(
                    {'error': 'Invalid bond amount: 0, it must be greater than 0.'});
            });
        });

    it('should check expense amount while creating contract',
        async () => {
            const req = {
                params: {
                    projectId: 100,
                },
                body: {
                    strategy: {
                        freq: {
                            rent: 10,
                        },
                        bond: 10,
                    },
                    expenses: [
                        {
                            configId: 12,
                            rent: 0,
                        }],
                    from: 1000,
                    to: 2000,
                    user: {accountName: '', mobile: ''},
                },
            };

            const Users = {id: 100, findOrCreate: async () => [{id: 1999}]};
            const Auth = {
                id: 'Auth',
                findOrCreate: async () => [{id: 2999}],
                count: async () => 0,
            };
            const CashAccount = {
                findOrCreate: async () => ([
                    {
                        id: 321,
                        userId: 1999,
                    }]),
            };
            const Rooms = {id: 'Rooms'};
            const Houses = {id: 'Houses'};
            const Building = {id: 'Building'};
            const GeoLocation = {id: 'GeoLocation'};
            const HouseDevices = {id: 'HouseDevices'};
            global.MySQL = {
                Contracts: {},
                CashAccount,
                Auth,
                Users,
                Rooms,
                Houses,
                Building,
                GeoLocation,
                HouseDevices,
                Sequelize: {
                    transaction: async func => func({}),
                },
            };
            const resSpy = spy();
            await post(req, {send: resSpy}).then(() => {
                resSpy.should.have.been.called;
                resSpy.getCall(0).args[0].should.be.eql(500);
                resSpy.getCall(0).args[1].result.should.be.eql(
                    {error: `Invalid expense amount of configId ${req.body.expenses[0].configId}, it must be greater than 0.`});
            });
        });
    it('should check username duplication before while creating contract',
        async () => {
            const req = {
                params: {
                    projectId: 100,
                },
                body: {
                    user: {accountName: 'duplicated', mobile: ''},
                },
            };

            const Users = {id: 100, findOrCreate: async () => [{id: 1999}]};
            const Auth = {
                id: 'Auth',
                findOrCreate: async () => [{id: 2999}],
                count: async () => 1,
            };
            const CashAccount = {
                findOrCreate: async () => ([
                    {
                        id: 321,
                        userId: 1999,
                    }]),
            };
            const Rooms = {id: 'Rooms'};
            const Houses = {id: 'Houses'};
            const Building = {id: 'Building'};
            const GeoLocation = {id: 'GeoLocation'};
            const HouseDevices = {id: 'HouseDevices'};
            global.MySQL = {
                Contracts: {},
                CashAccount,
                Auth,
                Users,
                Rooms,
                Houses,
                Building,
                GeoLocation,
                HouseDevices,
                Sequelize: {
                    transaction: async func => func({}),
                },
            };
            const resSpy = spy();
            await post(req, {send: resSpy}).then(() => {
                resSpy.should.have.been.called;
                resSpy.getCall(0).args[0].should.be.eql(500);
                resSpy.getCall(0).args[1].result.should.be.eql(
                    {error: `username ${req.body.user.accountName} already exists`});
            });
        });
});