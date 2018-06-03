'use strict';

const {post} = require('../../services/v1.0/handlers/projects/:projectId/devices');
require('include-node');
const {spy, stub} = require('sinon');
const {fn} = require('moment');
const sinon = require('sinon');

const sandbox = sinon.sandbox.create();

describe('Devices', function() {
    before(() => {
        sandbox.stub(fn, 'unix');
        fn.unix.returns(20189999);
    });
    after(() => {
        sandbox.restore();
    });
    it('should be created by post', async () => {
        const req = {
            params: {
                projectId: 100,
            },
            body: [{
                deviceId: 'YTL043000101519',
                memo: 'memo'
            }]
        };
        const bulkCreateStub = stub().resolves([]);
        const channelbulkCreate = stub().resolves([]);
        global.MySQL = {
            Devices: {
                bulkCreate: bulkCreateStub
            },
            DevicesChannels: {
                bulkCreate: channelbulkCreate
            },
            Sequelize: {
                transaction: async f => f(),
            },
        };
        const sendSpy = spy();
        await post(req, {send: sendSpy});
        sendSpy.should.have.been.called;
        bulkCreateStub.should.have.been.called;
        channelbulkCreate.should.have.been.called;
        sendSpy.getCall(0).args[0].should.be.eql(201);
        bulkCreateStub.getCall(0).args[0].should.be.eql([{
            deviceId: 'YTL043000101519',
            projectId: 100,
            memo: 'memo'
        }]);
        channelbulkCreate.getCall(0).args[0].should.be.eql([{
            deviceId: 'YTL043000101519',
            channelId: 11,
            comi: '1.000000',
            memo: 'memo',
            scale: 0,
            updatedAt: 20189999,
        }]);
    });
});