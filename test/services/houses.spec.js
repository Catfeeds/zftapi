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
        async findAll() {
          return [
            {
              toJSON: () => ({
                id: 'id',
                code: 'code',
                roomNumber: 'roomNumber',
                currentFloor: 'currentFloor',
                layouts: 'layouts',
                houseFormat: 'SHARE',
                houseKeeper: 0,
                building: {
                  group: 'group',
                  building: 'building',
                  location: 'location',
                  unit: 'unit',
                },

              }),
            }
          ];
        },
        count: fp.constant(1)
      },
    };
    const resSpy = spy();

    await get(req, {send: resSpy}).then(() => {
      resSpy.should.have.been.called;
      resSpy.getCall(0).args[0].should.be.eql({
        data: [
          {
            houseFormat: 'SHARE',
            building: 'building',
            code: 'code',
            currentFloor: 'currentFloor',
            devices: [],
            group: 'group',
            houseId: 'id',
            layout: 'layouts',
            location: 'location',
            houseKeeper: 0,
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

  it('should handle null device from toJSON', async function() {
    const req = {
      params: {
        projectId: 100,
      },
      query: {houseFormat: 'SHARE', q: 'q'},

    };
    global.MySQL = {
      Houses: {
        async findAll() {
          return [
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
                devices: [{device: null}, {device: {deviceId: 'deviceId'}}],
                rooms: null,
              }),
            }];
        },
        count: fp.constant(1)
      },
    };
    const resSpy = spy();

    await get(req, {send: resSpy}).then(() => {
      resSpy.should.have.been.called;
      const devices = resSpy.getCall(0).args[0].data[0].devices;
      devices.should.have.length(1);
      fp.head(devices).deviceId.should.be.eql('deviceId');
      fp.head(devices).status.service.should.be.eql('EMC_OFFLINE');
    });

  });
});