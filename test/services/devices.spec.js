'use strict';

const {post} = require(
  '../../services/v1.0/handlers/projects/:projectId/devices');
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
      body: [
        {
          deviceId: '000000000003',
          driver: 'YTL/Electric/YTL-BUSvA.1.02.js',
          memo: 'memo',
          name: 'name'
        }],
    };
    const bulkCreateStub = stub().resolves([]);
    const channelBulkCreate = stub().resolves([]);
    const findAllStub = stub().resolves([]);
    global.MySQL = {
      Devices: {
        findAll: findAllStub,
        bulkCreate: bulkCreateStub,
      },
      DevicesChannels: {
        bulkCreate: channelBulkCreate,
      },
      Sequelize: {
        transaction: async f => f(),
      },
    };
    const sendSpy = spy();
    await post(req, {send: sendSpy});
    sendSpy.should.have.been.called;
    bulkCreateStub.should.have.been.called;
    channelBulkCreate.should.have.been.called;
    findAllStub.should.have.been.called;
    sendSpy.getCall(0).args[0].should.be.eql(201);
    bulkCreateStub.getCall(0).args[0].should.be.eql([
      {
        deviceId: 'YTL000000000003',
        projectId: 100,
        memo: 'memo',
        name: 'name',
        driver: 'YTL/Electric/YTL-BUSvA.1.02.js',
        freq: 600,
        type: 'ELECTRICITY',
        status: {switch:'EMC_ON'},
      }]);
    channelBulkCreate.getCall(0).args[0].should.be.eql([
      {
        deviceId: 'YTL000000000003',
        channelId: '11',
        comi: '1.000000',
        scale: 0,
        updatedAt: 20189999,
      }]);
    findAllStub.getCall(0).args[0].should.be.eql({
      attributes: [
        'deviceId',
      ],
      where: {
        deviceId: {
          $in: [
            'YTL000000000003',
          ],
        },
        projectId: {
          $ne: 100,
        },
      },
    });
  });
  //TODO:
  it('should reject invalid id format', async () => {
    const req = {
      params: {
        projectId: 100,
      },
      body: [
        {
          deviceId: 'xxx',
          memo: 'memo',
        }, {
          deviceId: 'yyy',
          memo: 'memo',
        }, {
          deviceId: '000000000003',
          memo: 'memo',
        }],
    };
    const sendSpy = spy();
    await post(req, {send: sendSpy});
    sendSpy.should.have.been.called;
    sendSpy.getCall(0).args.should.be.eql([
      422, {
        code: 20000019,
        message: '仪表ID错误',
        result: {
          message: 'incorrect id format: xxx,yyy',
        },
      }]);
  });
  it('should reject duplicated ids', async () => {
    const req = {
      params: {
        projectId: 100,
      },
      body: [
        {
          deviceId: '000000000001',
          memo: 'memo',
        }, {
          deviceId: '000000000002',
          memo: 'memo',
        }, {
          deviceId: '000000000003',
          memo: 'memo',
        }, {
          deviceId: '000000000001',
          memo: 'memo',
        }, {
          deviceId: '000000000002',
          memo: 'memo',
        }],
    };

    const sendSpy = spy();
    await post(req, {send: sendSpy});
    sendSpy.should.have.been.called;
    sendSpy.getCall(0).args.should.be.eql([
      422, {
        code: 20000019,
        message: '仪表ID错误',
        result: {
          message: 'duplicated id format: 000000000001,000000000002',
        },
      }]);
  });
  it('should reject duplicated ids in other projects', async () => {
    const req = {
      params: {
        projectId: 100,
      },
      body: [
        {
          deviceId: '000000000001',
          memo: 'memo',
        }, {
          deviceId: '000000000002',
          memo: 'mem2',
        }],
    };

    global.MySQL = {
      Devices: {
        findAll: async () => [
          {
            toJSON: () => ({deviceId: 'YTL000000000001',}),
          },
          {
            toJSON: () => ({deviceId: 'YTL000000000002',}),
          }],
      },
    };

    const sendSpy = spy();
    await post(req, {send: sendSpy});
    sendSpy.should.have.been.called;
    sendSpy.getCall(0).args.should.be.eql([
      422, {
        code: 20000019,
        message: '仪表ID错误',
        result: {
          message: 'duplicated id in other project: YTL000000000001,YTL000000000002',
        },
      }]);
  });
});
