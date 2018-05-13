'use strict';

const fp = require('lodash/fp');
const moment = require('moment');
const {spy} = require('sinon');
const {get} = require(
    '../../services/v1.0/handlers/projects/:projectId/devices/reading');

describe('Reading meters', function() {
    before(() => {
        global.Typedef = Include('/libs/typedef');
        global.ErrorCode = Include('/libs/errorCode');
        global.Util = Include('/libs/util');
        global.SnowFlake = {next: fp.constant(1)};
    });
    afterEach(() => {
    });
    it('should return rooms with detail', async function() {
        const house = {
            toJSON: () => ({
                building: {
                    building: 'building',
                    unit: 'unit',
                    location: 'location',
                },
                roomNumber: 'roomNumber',
                prices: [
                    {
                        price: 1000,
                    },
                ],
                rooms: [
                    {
                        id: 'roomId',
                        name: 'roomName',
                        contracts: [{
                            userId: 222,
                            user: {
                                name: 'username',
                            },
                            from: 200000,
                            to: 300000,
                        }],
                        devices: [
                            {
                                deviceId: 123,
                            },
                        ],
                    },
                ],
            }),
        };
        const req = {
            params: {
                projectId: 100,
            },
            query: {
                houseFormat: 'SHARE',
                startDate: 100000,
                endDate: 200000,
            },

        };
        global.MySQL = {
            Houses: {
                async findAll() {
                    return [house];
                },
            },
            DeviceHeartbeats: {
                async findAll() {
                    return [{toJSON: () => ({deviceId: 123, startScale: 100, endScale: 200, startDate: 100, endDate: 200})}];
                },
            },
            Sequelize: {
                fn: () => {},
                col: () => {},
            }
        };
        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
            resSpy.should.have.been.called;
            resSpy.getCall(0).args[0].data.should.be.eql([
                {
                    location: 'location',
                    roomId: 'roomId',
                    roomName: 'roomName',
                    roomNumber: 'roomNumber',
                    unit: 'unit',
                    building: 'building',
                    details: [
                        {
                            amount: 1000 * 100,
                            price: 1000,
                            device: {
                                deviceId: 123,
                            },
                            endDate: timeAlign(200000),
                            startDate: timeAlign(100000),
                            endScale: '200.0000',
                            startScale: '100.0000',
                            usage: 100,
                            userId: 222,
                            userName: 'username',
                        },
                    ],
                }]);
        });
    });
    it('should ignore duplicated devices in one room', async function() {
        const house = {
            toJSON: () => ({
                building: {
                    building: 'building',
                    unit: 'unit',
                    location: 'location',
                },
                roomNumber: 'roomNumber',
                prices: [
                    {
                        price: 1000,
                    },
                ],
                rooms: [
                    {
                        id: 'roomId',
                        name: 'roomName',
                        contracts: [{
                            userId: 222,
                            user: {
                                name: 'username',
                            },
                            from: 200000,
                            to: 300000,
                        }],
                        devices: [
                            {
                                deviceId: 123,
                            },
                            {
                                deviceId: 123,
                            },
                        ],
                    },
                ],
            }),
        };
        const req = {
            params: {
                projectId: 100,
            },
            query: {
                houseFormat: 'SHARE',
                startDate: 100000,
                endDate: 200000,
            },

        };
        global.MySQL = {
            Houses: {
                async findAll() {
                    return [house];
                },
            },
            DeviceHeartbeats: {
                async findAll() {
                    return [{toJSON: () => ({deviceId: 123, startScale: 100, endScale: 200, startDate: 100, endDate: 200})}];
                },
            },
            Sequelize: {
                fn: () => {},
                col: () => {},
            }
        };
        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
            resSpy.should.have.been.called;
            resSpy.getCall(0).args[0].data.should.be.eql([
                {
                    location: 'location',
                    roomId: 'roomId',
                    roomName: 'roomName',
                    roomNumber: 'roomNumber',
                    unit: 'unit',
                    building: 'building',
                    details: [
                        {
                            amount: 1000 * 100,
                            price: 1000,
                            device: {
                                deviceId: 123,
                            },
                            endDate: timeAlign(200000),
                            startDate: timeAlign(100000),
                            endScale: '200.0000',
                            startScale: '100.0000',
                            usage: 100,
                            userId: 222,
                            userName: 'username',
                        },
                    ],
                }]);
        });
    });
    it('should return house and its rooms with detail', async function() {
        const house = {
            toJSON: () => ({
                id: 199,
                building: {
                    building: 'building',
                    unit: 'unit',
                    location: 'location',
                },
                roomNumber: 'roomNumber',
                prices: [
                    {
                        price: 2000,
                    },
                ],
                devices: [
                    {
                        deviceId: 234,
                        deviceHeartbeats: [
                            {
                                total: 900,
                            },
                            {
                                total: 2000,
                            },
                        ],
                    },
                ],
            }),
        };
        const req = {
            params: {
                projectId: 100,
            },
            query: {
                houseFormat: 'SHARE',
                startDate: 100000,
                endDate: 200000,
                houseId: 199,
            },

        };
        global.MySQL = {
            Houses: {
                async findAll() {
                    return [house];
                },
            },
            DeviceHeartbeats: {
                async findAll() {
                    return [{toJSON: () => ({deviceId: 123, startScale: 100, endScale: 200, startDate: 100, endDate: 200})},
                        {toJSON: () => ({deviceId: 234, startScale: 900, endScale: 2000, startDate: 100, endDate: 200})}];
                },
            },
            Sequelize: {
                fn: () => {},
                col: () => {},
            }
        };
        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
            resSpy.should.have.been.called;
            resSpy.getCall(0).args[0].data.should.be.eql([
                {
                    houseId: 199,
                    location: 'location',
                    roomNumber: 'roomNumber',
                    unit: 'unit',
                    building: 'building',
                    details: [
                        {
                            amount: 2000 * 1100,
                            price: 2000,
                            device: {
                                deviceId: 234,
                            },
                            endScale: '2000.0000',
                            startScale: '900.0000',
                            endDate: timeAlign(200000),
                            startDate: timeAlign(100000),
                            usage: 1100,
                        },
                    ],
                }]);
        });
    });

    it('should return scale no more than 4 fixed-point notation', async function() {
        const house = {
            toJSON: () => ({
                building: {
                    building: 'building',
                    unit: 'unit',
                    location: 'location',
                },
                roomNumber: 'roomNumber',
                prices: [
                    {
                        price: 1000,
                    },
                ],
                rooms: [
                    {
                        id: 'roomId',
                        name: 'roomName',
                        contracts: [{
                            userId: 222,
                            user: {
                                name: 'username',
                            },
                            from: 200000,
                            to: 300000,
                        }],
                        devices: [
                            {
                                deviceId: 123,
                            }
                        ],
                    },
                ],
            }),
        };
        const req = {
            params: {
                projectId: 100,
            },
            query: {
                houseFormat: 'SHARE',
                startDate: 100000,
                endDate: 200000,
            },

        };
        global.MySQL = {
            Houses: {
                async findAll() {
                    return [house];
                },
            },
            DeviceHeartbeats: {
                async findAll() {
                    return [{toJSON: () => ({deviceId: 123, startScale: 1.0000000000001, endScale: 2, startDate: 100000, endDate: 150000})}];
                },
            },
            Sequelize: {
                fn: () => {},
                col: () => {},
            }
        };
        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
            resSpy.should.have.been.called;
            resSpy.getCall(0).args[0].data.should.be.eql([
                {
                    location: 'location',
                    roomId: 'roomId',
                    roomName: 'roomName',
                    roomNumber: 'roomNumber',
                    unit: 'unit',
                    building: 'building',
                    details: [
                        {
                            amount: 1 * 1000,
                            price: 1000,
                            device: {
                                deviceId: 123,
                            },
                            endDate: timeAlign(200000),
                            startDate: timeAlign(100000),
                            endScale: '2.0000',
                            startScale: '1.0000',
                            usage: 1,
                            userId: 222,
                            userName: 'username',
                        },
                    ],
                }]);
        });
    });

});

const timeAlign = time => moment.unix(time).
    startOf('days').
    unix();