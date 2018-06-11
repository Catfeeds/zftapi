'use strict';

const moment = require('moment');
const {spy} = require('sinon');
const {get} = require(
  '../../../services/v1.0/handlers/projects/:projectId/devices/:deviceId/usage');

describe('Device usage', function() {
  before(() => {
    global.Typedef = Include('/libs/typedef');
  });
  it('should return usage of device', async function() {
    const usages = [
      {
        toJSON: () => ({
          time: moment(1525939200000).format('YYYY-MM-DD HH:00:00'),
          endScale: '2',
          startScale: '1',
        }),
      }, {
        toJSON: () => ({
          time: moment(1525942800000).format('YYYY-MM-DD HH:00:00'),
          endScale: '4.999999',
          startScale: '3.888888',
        }),
      }];
    const req = {
      params: {
        projectId: 100,
      },
      query: {
        startDate: 1000000000,
        endDate: 2625946400,
      },

    };
    global.MySQL = {
      DeviceHeartbeats: {
        async findAll() {
          return usages;
        },
      },
      Sequelize: {
        fn: () => {
        },
        col: () => {
        },
      },
    };
    const resSpy = spy();

    await get(req, {send: resSpy}).then(() => {
      resSpy.should.have.been.called;
      resSpy.getCall(0).args[0].should.be.eql([
        {
          time: 1525939200,
          endScale: '20000',
          startScale: '10000',
          usage: 10000,
        },{
          time: 1525942800,
          endScale: '50000',
          startScale: '38889',
          usage: 11111,
        }]);
    });
  });

});