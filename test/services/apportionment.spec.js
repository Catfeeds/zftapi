'use strict';

const {put} = require(
    '../../services/v1.0/handlers/projects/:projectId/houses/:houseId/apportionment');
require('include-node');
const {spy, stub} = require('sinon');
const fp = require('lodash/fp');

describe('HouseApportionment', function() {
    before(() => {
        global.Typedef = Include('/libs/typedef');
        global.ErrorCode = Include('/libs/errorCode');
        global.log = {error: fp.noop};
    });
    it('should has 100% always', async function() {
        const req = {
            params: {
                projectId: 100,
            },
            body: [
                {
                    value: 99,
                }],
            query: {},
        };
        const sendSpy = spy();

        await put(req, {send: sendSpy}).then(() => {
            sendSpy.should.have.been.called;
            const response = sendSpy.getCall(0).args;
            response.should.be.eql([403, {code: 20000032, message: '参数错误'}]);
        });
    });

    it('should go auto by default', async function() {
        const req = {
            params: {
                projectId: 100,
                houseId: 999,
            },
            body: [
                {
                    roomId: 1,
                    value: 90,
                },
                {
                    roomId: 2,
                    value: 10,
                }],
            query: {},
        };
        const sendSpy = spy();
        const roomCountStub = stub().resolves(2);
        const contractsCountStub = stub().resolves(2);
        const apportionmentFindStub = stub().
            resolves([
                {
                    id: 1001,
                    roomId: 1,
                },
                {
                    id: 1002,
                    roomId: 2,
                },
                {
                    id: 1003,
                    roomId: 3,
                }]);
        const apportionmentUpdateSpy = spy();
        const apportionmentDestroySpy = spy();

        global.MySQL = {
            Rooms: {id: 'Rooms', count: roomCountStub},
            Contracts: {id: 'Contracts', count: contractsCountStub},
            HouseApportionment: {
                id: 'HouseApportionment',
                findAll: apportionmentFindStub,
                bulkCreate: apportionmentUpdateSpy,
                destroy: apportionmentDestroySpy,
            },
            Sequelize: {
                transaction: async () => ({
                    commit: fp.noop,
                    rollback: fp.noop,
                }),
            },
        };

        await put(req, {send: sendSpy}).then(() => {
            sendSpy.should.have.been.called;
            const response = sendSpy.getCall(0).args;
            response.should.be.eql([204]);
            apportionmentUpdateSpy.should.have.been.called;
            apportionmentUpdateSpy.getCall(0).args[0].should.be.eql([
                {
                    houseId: 999,
                    projectId: 100,
                    roomId: 1,
                    value: 90,
                    id: 1001,
                }, {
                    houseId: 999,
                    projectId: 100,
                    roomId: 2,
                    value: 10,
                    id: 1002,
                }]);
            apportionmentDestroySpy.getCall(0).args[0].where.should.be.eql({
                id: {
                    $in: [1003],
                },
            });
        });
    });

});