'use strict';
const {
    includeContracts, payBills, serviceCharge,
    moveFundChannelToRoot, shareFlows, platformFlows, logFlows,
} = require(
    '../../services/v1.0/common');
const {spy, stub} = require('sinon');

const Users = {id: 'Users'};
const Rooms = {id: 'Rooms'};
const Houses = {id: 'Houses'};
const Building = {id: 'Building'};
const GeoLocation = {id: 'GeoLocation'};
const Contracts = {id: 'Contracts'};

describe('Common', function() {
    before(() => {
        global.Typedef = Include('/libs/typedef');
        global.log = {error: () => ({})};
        global.SnowFlake = {next: () => 998811};
        global.SequelizeModels = {
            Users,
            Rooms,
            Houses,
            Building,
            GeoLocation,
            Contracts,
        };
    });
    describe('default', () => {
        it('should provide contracts condition', function() {
            const contractFilter = includeContracts(global.SequelizeModels);
            const contractOptions = contractFilter('');
            contractOptions.should.be.eql({
                include: [
                    {
                        model: Users,
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
                where: {
                    status: 'ONGOING',
                },
            });
        });
        it('should include terminated contracts if contract status is overridden',
            function() {
                const contractFilter = includeContracts(global.SequelizeModels);
                const contractOptions = contractFilter('', {});
                contractOptions.should.be.eql({
                    include: [
                        {
                            model: Users,
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
                });
            });
        it('should consider houseFormat if provided', function() {
            const contractFilter = includeContracts(global.SequelizeModels);
            const contractOptions = contractFilter('SOLE', {});
            contractOptions.should.be.eql({
                include: [
                    {
                        model: Users,
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
                                where: {
                                    houseFormat: 'SOLE',
                                },
                            },
                        ],
                        required: true,
                        model: Rooms,
                    },
                ],
                model: Contracts,
            });
        });

        it('should return Ok if no bill is passed in', async () => {
            const bills = [];
            const result = await payBills(global.MySQL)(bills);
            result.should.be.eql(
                ErrorCode.ack(ErrorCode.OK, {message: 'No bills were paid.'}));
        });

        it('should be able to pay bills successfully', async () => {
            const commit = spy();
            const rollback = spy();
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
            };

            const bills = [{}];
            const projectId = 1000;
            const fundChannel = {
                id: 1,
                serviceCharge: [
                    {
                        type: 'BILL',
                    }],
            };
            const userId = 2312;
            const orderNo = 311212;
            const category = 'BILL';
            const result = await payBills(global.MySQL)(bills, projectId,
                fundChannel, userId, orderNo, category);
            result.should.be.eql(ErrorCode.ack(ErrorCode.OK));
            commit.should.have.been.called;
            rollback.should.not.have.been.called;
        });

        it('should calculate charge base on fundChannel', () => {
            const chargeObj = serviceCharge({
                serviceCharge: [
                    {
                        type: 'BILL',
                        strategy: {fee: 10, user: 20, project: 80},
                    }],
            }, 1000);
            chargeObj.should.be.eql({
                amount: 1000,
                amountForBill: 1002,
                shareAmount: 10,
                share: {
                    user: 2,
                    project: 8,
                },
            });
        });

        it('should calculate 0 charge if no service charge in fundChannel',
            () => {
                serviceCharge({}, 100).should.be.eql({
                    amount: 100,
                    amountForBill: 100,
                    shareAmount: 0,
                });
            });
    });

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
                    eql({id: 99, serviceCharge: 2, aField: 1});
            });

        it('should return empty if result is empty', async function() {
            moveFundChannelToRoot({toJSON: () => ({})})([]).should.be.eql({});
        });
    });

    describe('shareFlows', () => {
        it('should be able to create according to serviceCharge',
            async function() {
                const serviceCharge = {
                    share: {
                        user: 10,
                        project: 90,
                    },
                };
                const orderNo = 321;
                const projectId = 100;
                const userId = 999;
                const billId = 111;
                const fundChannel = {id: 345};
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
                ]);
            });

        it('should be empty by default', async function() {
            shareFlows().should.be.eql([]);
        });

    });

    describe('platformFlows', () => {
        it('should be able to create according to serviceCharge & fundChannel',
            async function() {
                const serviceCharge = {
                    fee: 99,
                };
                const orderNo = 321;
                const projectId = 100;
                const userId = 999;
                const billId = 111;
                const fundChannel = {id: 345, fee: 100};
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
                ]);
            });
    });

    describe('logFlows', () => {
        it('should be able to create sub flows for BILL',
            async function() {
                const serviceCharge = {
                    amountForBill: 1000,
                    fee: 99,
                };
                const orderNo = 321;
                const projectId = 100;
                const userId = 999;
                const billId = 111;
                const fundChannel = {id: 345, fee: 100};
                const t = {id: 't'};
                const category = 'BILL';
                const createStub = stub().resolves({});
                const Models = {
                    FundChannelFlows: {
                        bulkCreate: createStub,
                    },
                };
                await logFlows(Models)(serviceCharge, orderNo, projectId,
                    userId, billId, fundChannel, t, category).then(() => {
                    createStub.should.have.been.called;
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
                    ]);
                });

            });
        it('should be able to create sub flows for TOPUP',
            async function() {
                const serviceCharge = {
                    amount: 1000,
                    fee: 99,
                };
                const orderNo = 321;
                const projectId = 100;
                const userId = 999;
                const billId = 111;
                const fundChannel = {id: 345, fee: 100};
                const t = {id: 't'};
                const category = 'TOPUP';
                const createStub = stub().resolves({});
                const Models = {
                    FundChannelFlows: {
                        bulkCreate: createStub,
                    },
                };
                await logFlows(Models)(serviceCharge, orderNo, projectId,
                    userId, billId, fundChannel, t, category).then(() => {
                    createStub.should.have.been.called;
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
                    ]);
                });

            });
    });
});