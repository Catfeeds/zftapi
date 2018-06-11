'use strict';

const {put} = require(
  '../../../services/v1.0/handlers/projects/:projectId/prices/:type');
require('include-node');
const {stub} = require('sinon');
const fp = require('lodash/fp');

describe('Prices', function() {
  before(() => {
    global.Typedef = Include('/libs/typedef');
  });
  it('should query houses by id if provided', async function() {
    const req = {
      params: {
        projectId: 100,
        type: '',
      },
      body: {
        category: '',
        price: '',
        houseIds: [333, 222],
      },
    };
    const sequelizeFindSpy = stub().resolves([]);

    const Houses = {id: 'Houses', findAll: sequelizeFindSpy};

    global.MySQL = {
      Houses,
      HouseDevicePrice: {
        findAll: fp.noop,
        update: fp.noop,
        bulkCreate: fp.noop,
      },
      Sequelize: {
        transaction: async () => ({
          commit: fp.noop,
          rollback: fp.noop,
        }),
      },
    };

    await put(req, {send: fp.noop}).then(() => {
      sequelizeFindSpy.should.have.been.called;
      const modelOptions = sequelizeFindSpy.getCall(0).args[0];
      modelOptions.where.should.be.eql({
        id: {
          $in: [
            333,
            222,
          ],
        },
        projectId: 100,
        status: {
          $ne: 'DELETED',
        },
      });
    });
  });

  it('should query houses with default condition if no id is provided',
    async function() {
      const req = {
        params: {
          projectId: 100,
          type: '',
        },
        body: {
          category: '',
          price: '',
        },
      };
      const sequelizeFindSpy = stub().resolves([]);

      const Houses = {id: 'Houses', findAll: sequelizeFindSpy};

      global.MySQL = {
        Houses,
        HouseDevicePrice: {
          findAll: fp.noop,
          update: fp.noop,
          bulkCreate: fp.noop,
        },
        Sequelize: {
          transaction: async () => ({
            commit: fp.noop,
            rollback: fp.noop,
          }),
        },
      };

      await put(req, {send: fp.noop}).then(() => {
        sequelizeFindSpy.should.have.been.called;
        const modelOptions = sequelizeFindSpy.getCall(0).args[0];
        modelOptions.where.should.be.eql({
          projectId: 100,
          status: {
            $ne: 'DELETED',
          },
        });
      });
    });
});