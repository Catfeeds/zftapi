'use strict';

const {get} = require(
    '../../services/v1.0/handlers/projects/:projectId/houses');
require('include-node');
const {spy} = require('sinon');
const fp = require('lodash/fp');

describe('Houses', function() {
    before(() => {
        global.Typedef = Include('/libs/typedef');
        global.Util = Include('/libs/util');
        global.log = {error: fp.noop};
    });

    it('should return all houses from findAndCountAll', async function() {
        const req = {
            params: {
                projectId: 100,
            },
            query: {houseFormat: 'SHARE', q: 'q'},

        };
        global.MySQL = {
            Houses: {
                async findAndCountAll() {
                    return {
                        count: 1,
                        rows: [
                            {
                                toJSON: () => ({
                                    id: 'id',
                                    code: 'code',
                                    roomNumber: 'roomNumber',
                                    currentFloor: 'currentFloor',
                                    layouts: 'layouts',
                                    building: {
                                        group: 'group',
                                        building: 'building',
                                        location: 'location',
                                        unit: 'unit',
                                    },

                                }),
                            }],
                    };
                },
            },
        };
        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
            resSpy.should.have.been.called;
            console.log(resSpy.getCall(0).args[0]);
            resSpy.getCall(0).args[0].should.be.eql({
                data: [
                    {
                        building: 'building',
                        code: 'code',
                        currentFloor: 'currentFloor',
                        devices: [],
                        group: 'group',
                        houseId: 'id',
                        layout: 'layouts',
                        location: 'location',
                        prices: [],
                        roomNumber: 'roomNumber',
                        rooms: [],
                        unit: 'unit',
                    },
                ],
                paging: {
                    count: 1,
                    index: 1,
                    size: 10,
                },
            });
        });

    });
});