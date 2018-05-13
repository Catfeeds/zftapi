'use strict';

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
                    time: '2018-05-10 18:00:00',
                    endScale: '2',
                    startScale: '1',
                }),
            }, {
                toJSON: () => ({
                    time: '2018-05-10 19:00:00',
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
                    endScale: '2',
                    startScale: '1',
                    usage: '1.0000',
                },{
                    time: 1525942800,
                    endScale: '4.999999',
                    startScale: '3.888888',
                    usage: '1.1111',
                }]);
        });
    });

});