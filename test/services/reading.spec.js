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
                rooms: [
                    {
                        id: 'roomId',
                        name: 'roomName',
                        prices: [
                            {
                                price: 1000,
                            },
                        ],
                        devices: [
                            {
                                deviceId: 123,
                                deviceHeartbeats: [
                                    {
                                        total: 100,
                                    },
                                    {
                                        total: 200,
                                    },
                                ],
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
                            endScale: 200,
                            startScale: 100,
                            startDate: timeAlign(100000),
                            usage: 100,
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
                prices: [
                    {
                        price: 2000,
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
                            endDate: timeAlign(200000),
                            endScale: 2000,
                            startScale: 900,
                            startDate: timeAlign(100000),
                            usage: 1100,
                        },
                    ],
                }]);
        });
    });

});

const timeAlign = time => moment.unix(time).
    startOf('days').
    unix();