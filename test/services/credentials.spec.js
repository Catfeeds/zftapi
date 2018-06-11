'use strict';

const {get, post} = require(
  '../../services/v1.0/handlers/projects/:projectId/credentials');
const single = require(
  '../../services/v1.0/handlers/projects/:projectId/credentials/:credentialId');
require('include-node');
const {spy} = require('sinon');
const fp = require('lodash/fp');

describe('Credentials', function() {
  before(() => {
    global.Typedef = Include('/libs/typedef');
    global.ErrorCode = Include('/libs/errorCode');
  });
  it('should return all credentials from findAll', async function() {
    const req = {
      params: {
        projectId: 100,
      },
    };
    global.MySQL = {
      Auth: {
        async findAll() {
          return [];
        },
      },
    };
    const resSpy = spy();

    await get(req, {send: resSpy}).then(() =>
      resSpy.should.have.been.calledWith([]),
    );
  });

  it('should omit createdAt, updatedAt, password fields', async function() {
    const req = {
      params: {
        projectId: 100,
      },
    };
    global.MySQL = {
      Auth: {
        async findAll() {
          return [
            {
              dataValues: {
                createdAt: 2,
                updatedAt: 3,
                password: '123',
                onlyMe: 'haha',
              },
            }];
        },
      },
    };
    const resSpy = spy();

    await get(req, {send: resSpy}).then(() =>
      resSpy.should.have.been.calledWith([{onlyMe: 'haha'}]),
    );
  });

  it('should omit null value fields', async function() {
    const req = {
      params: {
        projectId: 100,
      },
    };
    global.MySQL = {
      Auth: {
        async findAll() {
          return [
            {
              dataValues: {
                nullField1: null,
                nullField2: null,
                onlyMe: 'haha',
              },
            }];
        },
      },
    };
    const resSpy = spy();

    await get(req, {send: resSpy}).then(() =>
      resSpy.should.have.been.calledWith([{onlyMe: 'haha'}]),
    );
  });

  it('should create auth if information are correct', async function() {
    const req = {
      isAuthenticated: () => true,
      params: {
        projectId: 100,
      },
      body: {
        username: 'username',
        level: 'MANAGER',
        password: 'somepass',
        email: 'a@b.cn',
      },
      user: {
        level: 'ADMIN',
      },
    };
    global.MySQL = {
      Auth: {
        create: async body => body,
      },
    };

    const resSpy = spy();

    await post(req, {send: resSpy}).then(() =>
      resSpy.should.have.been.calledWith(200,
        ErrorCode.ack(ErrorCode.OK, {username: req.body.username})),
    );
  });

  it('should return 400 if password is empty', async function() {
    const req = {
      params: {
        projectId: 100,
      },
      body: {
        username: 'username',
        level: 'level',
        email: 'a@b.com',
      },
    };
    const resSpy = spy();

    await post(req, {send: resSpy}).then(() =>
      resSpy.should.have.been.calledWith(400,
        ErrorCode.ack(ErrorCode.PARAMETERERROR,
          {error: 'please provide md5 encrypted password'})),
    );
  });

  it('should return 400 if email is empty', async function() {
    const req = {
      params: {
        projectId: 100,
      },
      body: {
        username: 'username',
        level: 'level',
        password: '123',
      },
    };
    const resSpy = spy();

    await post(req, {send: resSpy}).then(() =>
      resSpy.should.have.been.calledWith(400,
        ErrorCode.ack(ErrorCode.PARAMETERERROR,
          {error: 'email is required'})),
    );
  });

  it('should allow to patch partial fields', async function() {
    const req = {
      isAuthenticated: () => true,
      user: {
        id: 1
      },
      params: {
        projectId: 100,
        credentialId: 1,
      },
      body: {
        oldPassword: '321',
        password: '12312312312312312312312312312312',
        email: 'a@b.c',
        mobile: '123',
      },
    };

    const updateSpy = spy();
    global.MySQL = {
      Auth: {
        findById: async () => ({password: '321', updateAttributes: updateSpy}),
      },
    };

    await single.patch(req, {json: fp.noop}).then(() =>
      updateSpy.should.have.been.calledWith({
        password: '12312312312312312312312312312312',
        email: 'a@b.c',
        mobile: '123',
      }),
    );
  });

  it('should patch valid fields only', async function() {
    const req = {
      isAuthenticated: () => true,
      user: {
        id: 1
      },
      params: {
        projectId: 100,
        credentialId: 1,
      },
      body: {
        email: 'c@b.c',
      },
    };

    const updateSpy = spy();
    global.MySQL = {
      Auth: {
        findById: async () => ({updateAttributes: updateSpy}),
      },
    };

    await single.patch(req, {json: fp.noop}).then(() =>
      updateSpy.should.have.been.calledWith({email: 'c@b.c'}),
    );
  });

  it('should check password while patching', async function() {
    const req = {
      isAuthenticated: () => true,
      user: {
        id: 1
      },
      params: {
        projectId: 100,
        credentialId: 1,
      },
      body: {
        password: 'c@b.c',
      },
    };

    const updateSpy = spy();
    global.MySQL = {
      Auth: {
        findById: async () => ({updateAttributes: updateSpy}),
      },
    };

    const resSpy = spy();
    await single.patch(req, {send: resSpy}).then(() => {
      updateSpy.should.have.not.been.called;
      resSpy.should.have.been.calledWith(400,
        ErrorCode.ack(ErrorCode.PARAMETERERROR,
          {error: 'please provide md5 encrypted password'}));

    });
  });

  it('should check oldPassword while patching', async function() {
    const req = {
      isAuthenticated: () => true,
      user: {
        id: 1
      },
      params: {
        projectId: 100,
        credentialId: 1,
      },
      body: {
        password: '12312312312312312312312312312312',
      },
    };

    const updateSpy = spy();
    global.MySQL = {
      Auth: {
        findById: async () => ({password: '', updateAttributes: updateSpy}),
      },
    };

    const resSpy = spy();
    await single.patch(req, {send: resSpy}).then(() => {
      updateSpy.should.have.not.been.called;

      resSpy.should.have.been.calledWith(500);
    });
  });

  it('should not check oldPassword if not changing password', async function() {
    const req = {
      isAuthenticated: () => true,
      user: {
        id: 1
      },
      params: {
        projectId: 100,
        credentialId: 1,
      },
      body: {
        mobile: '321',
      },
    };

    const updateSpy = spy();
    global.MySQL = {
      Auth: {
        findById: async () => ({password: '', updateAttributes: updateSpy}),
      },
    };

    const resSpy = spy();
    await single.patch(req, {json: resSpy}).then(() => {
      updateSpy.should.have.been.called;

      resSpy.should.have.been.calledWith(ErrorCode.ack(ErrorCode.OK, {}));
    });
  });

  it('should allow admin to delete user', async function() {
    const req = {
      isAuthenticated: () => true,
      params: {
        projectId: 100,
        credentialId: 99,
      },
      user: {
        level: 'ADMIN',
      },
    };

    const deleteSpy = spy();
    global.MySQL = {
      Auth: {
        findById: async () => ({destroy: deleteSpy}),
      },
    };

    const resSpy = spy();
    await single.delete(req, {json: resSpy}).then(() => {
      deleteSpy.should.have.been.called;
      resSpy.should.have.been.calledWith(ErrorCode.ack(ErrorCode.OK));

    });
  });
  it('should not allow manager to delete user', async function() {
    const req = {
      isAuthenticated: () => true,
      params: {
        projectId: 100,
        credentialId: 99,
      },
      user: {
        level: 'MANAGER',
      },
    };

    const deleteSpy = spy();
    global.MySQL = {
      Auth: {
        findById: async () => ({destroy: deleteSpy}),
      },
    };

    const resSpy = spy();
    await single.delete(req, {send: resSpy}).then(() => {
      deleteSpy.should.not.have.been.called;
      resSpy.should.have.been.calledWith(403,
        ErrorCode.ack(ErrorCode.PERMISSIONDENIED,
          {error: 'Only admin can delete users.'}));

    });
  });
  it('should not allow admin to delete themselves', async function() {
    const req = {
      isAuthenticated: () => true,
      params: {
        projectId: 100,
        credentialId: 1000,
      },
      user: {
        level: 'ADMIN',
        id: 1000
      },
    };

    const deleteSpy = spy();
    global.MySQL = {
      Auth: {
        findById: async () => ({destroy: deleteSpy}),
      },
    };

    const resSpy = spy();
    await single.delete(req, {send: resSpy}).then(() => {
      deleteSpy.should.not.have.been.called;
      resSpy.should.have.been.calledWith(403,
        ErrorCode.ack(ErrorCode.NOTSUPPORT,
          {error: 'Don\'t attempt to delete yourself.'}));

    });
  });
});