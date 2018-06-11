'use strict';

const fp = require('lodash/fp');
const {get, put, patch} = require(
  '../../services/v1.0/handlers/projects/:projectId/users/:userId');
require('include-node');
const {spy, stub} = require('sinon');


describe('Single user', function() {
  it('should return user information', async function() {
    const userInfo = {
      toJSON: () => ({
        name: 'name',
        auth: {
          username: 'username',
        },
      }),
    };
    const req = {
      params: {
        projectId: 100,
        userId: 123,
      },
    };
    global.MySQL = {
      Users: {
        async findById() {
          return userInfo;
        },
      },
    };

    const resSpy = spy();

    await get(req, {send: resSpy}).then(() => {
      const response = resSpy.getCall(0).args[0];
      response.should.be.eql({name: 'name', username: 'username'});
    });
  });
  it('should reset password by put method', async function() {
    const updateSpy = stub().resolves({});
    const userInfo = {
      auth: {
        updateAttributes: updateSpy
      },
    };
    const req = {
      isAuthenticated: () => true,
      user: {
        level: 'ADMIN',
      },
      params: {
        projectId: 100,
        userId: 123,
      },
    };
    global.MySQL = {
      Users: {
        async findById() {
          return userInfo;
        },
      },
    };
    await put(req, {send: fp.noop}).then(() => {
      updateSpy.should.have.been.called;
      const response = updateSpy.getCall(0).args[0];
      response.should.be.eql({password: 'e10adc3949ba59abbe56e057f20f883e'});
    });
  });
  it('should allow to patch user fields', async function() {
    const authUpdateSpy = stub().resolves({});
    const userUpdateSpy = stub().resolves({});
    const userInfo = {
      updateAttributes: userUpdateSpy,
      auth: {
        updateAttributes: authUpdateSpy
      },
    };
    const req = {
      params: {
        projectId: 100,
        userId: 123,
      },
      body: {
        name: 'allow change me',
        password: 'not allow to change me',
      }
    };
    global.MySQL = {
      Users: {
        findById: async () => userInfo,
      },
    };
    await patch(req, {send: fp.noop}).then(() => {
      authUpdateSpy.should.have.been.called;
      userUpdateSpy.should.have.been.called;
      const authUpdateParams = authUpdateSpy.getCall(0).args[0];
      authUpdateParams.should.be.eql(fp.omit('password')(req.body));
      const userUpdateParams = userUpdateSpy.getCall(0).args[0];
      userUpdateParams.should.be.eql(fp.omit('password')(req.body));
    });
  });
});