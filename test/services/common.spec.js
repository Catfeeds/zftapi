'use strict';
const {includeContracts, payBills, serviceCharge} = require(
    '../../services/v1.0/common');
const {spy} = require('sinon');

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
            Contracts
        };
    });
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

    it('should calculate 0 charge if no service charge in fundChannel', () => {
        serviceCharge({}, 100).should.be.eql({
            amount: 100,
            amountForBill: 100,
            shareAmount: 0,
        });
    });

});