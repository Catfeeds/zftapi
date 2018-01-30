'use strict';
const {get} = require('../../services/v1.0/handlers/projects/:projectId/flows');
require('include-node');
const {stub, spy} = require('sinon');
const fp = require('lodash/fp');

describe('Flows', function() {
    before(() => {
        global.Typedef = Include('/libs/typedef');
        global.ErrorCode = Include('/libs/errorCode');
        global.Util = Include('/libs/util');
    });

    it('should pass correct option while querying flows', async function() {
        const req = {
            params: {
                projectId: 100,
                roomId: 200,
            },
            query: {},
        };
        const sequelizeFindSpy = stub().resolves([]);
        const Users = {id: 'Users'};
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
        const Topup = {id: 'Topup'};
        const Auth = {id: 'Auth'};
        const BillPayment = {id: 'BillPayment'};
        const Contracts = {id: 'Contracts'};
        const Bills = {id: 'Bills'};
        const BillFlows = {id: 'BillFlows'};
        const FundChannelFlows = {id: 'FundChannelFlows'};
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
        };

        await get(req, {send: fp.noop}).then(() => {
            sequelizeFindSpy.should.have.been.called;
            const countingOption = sequelizeFindSpy.getCall(0).args[0];
            console.log(JSON.stringify(countingOption));
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
                                            },
                                            {
                                                attributes: [
                                                    'id',
                                                    'name',
                                                ],
                                                include: [
                                                    {
                                                        as: 'house',
                                                        attributes: [
                                                            'id',
                                                            'roomNumber',
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
                                                                    },
                                                                ],
                                                                model: Building,
                                                            },
                                                        ],
                                                        model: Houses,
                                                    },
                                                ],
                                                required: true,
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
                                            'category',
                                            'orderNo',
                                            'from',
                                            'to',
                                            'amount'],
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
                        model: BillPayment,
                    },
                    {
                        include: [
                            {
                                include: [
                                    {
                                        model: Users,
                                    },
                                    {
                                        attributes: [
                                            'id',
                                            'name',
                                        ],
                                        required: true,
                                        include: [
                                            {
                                                as: 'house',
                                                attributes: [
                                                    'id',
                                                    'roomNumber',
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
                                                            },
                                                        ],
                                                        model: Building,
                                                    },
                                                ],
                                                model: Houses,
                                            },
                                        ],
                                        model: Rooms,
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
                        model: Topup,
                    },
                ],
                limit: 10,
                offset: 0,
                where: {
                    projectId: 100,
                },
            });
        });
    });

    it('should convert bill payments to flows', async function() {
        const req = {
            params: {
                projectId: 100,
            },
            query: {},
        };
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
                                        'remark': '',
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
                                                    dataValues: {
                                                        'config': {},
                                                        'id': '6361497057362055170',
                                                        'name': '1',
                                                        'status': 'IDLE',
                                                        house: {
                                                            dataValues: {
                                                                'config': {},
                                                                'id': '6361497057362055168',
                                                                'roomNumber': '2301',
                                                                building: {
                                                                    dataValues: {
                                                                        'config': {},
                                                                        'building': '一幢',
                                                                        'unit': '1单元',
                                                                        'group': '某',
                                                                        location: {
                                                                            dataValues: {
                                                                                'name': '新帝朗郡',
                                                                            },
                                                                        },

                                                                    },
                                                                },

                                                            },
                                                        },
                                                    },
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
                    };
                },
            },
        };
        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
            resSpy.should.have.been.called;
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
                'remark': '',
                room: {
                    'building': '一幢',
                    'group': '某',
                    'houseId': '6361497057362055168',
                    'id': '6361497057362055170',
                    'locationName': '新帝朗郡',
                    'roomName': '1',
                    'roomNumber': '2301',
                    'status': 'IDLE',
                    'unit': '1单元',
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
            });
        });
    });

    it('should convert topup to flows', async function() {
        const req = {
            params: {
                projectId: 100,
            },
            query: {},
        };
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
                                                dataValues: {
                                                    'config': {},
                                                    'id': '6361497057362055170',
                                                    'name': '1',
                                                    'status': 'IDLE',
                                                    house: {
                                                        dataValues: {
                                                            'config': {},
                                                            'id': '6361497057362055168',
                                                            'roomNumber': '2301',
                                                            building: {
                                                                dataValues: {
                                                                    'config': {},
                                                                    'building': '一幢',
                                                                    'unit': '1单元',
                                                                    'group': '某',
                                                                    location: {
                                                                        dataValues: {
                                                                            'name': '新帝朗郡',
                                                                        },
                                                                    },

                                                                },
                                                            },

                                                        },
                                                    },
                                                },
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
                    };
                },
            },
        };
        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
            resSpy.should.have.been.called;
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
                'room': {
                    'building': '一幢',
                    'group': '某',
                    'houseId': '6361497057362055168',
                    'id': '6361497057362055170',
                    'locationName': '新帝朗郡',
                    'roomName': '1',
                    'roomNumber': '2301',
                    'status': 'IDLE',
                    'unit': '1单元',
                },
                'user': {
                    'accountName': 'f1',
                    'name': 'www',
                    'id': 1,
                    'mobile': '',
                },
            });
        });
    });
});