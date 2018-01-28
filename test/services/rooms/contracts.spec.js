'use strict';
const {get} = require('../../../services/v1.0/handlers/projects/:projectId/rooms/:roomId/contracts');
require('include-node');
const {stub} = require('sinon');
const fp = require('lodash/fp');

describe('Contracts', function () {
    before(() => {
        global.Typedef = Include('/libs/typedef');
        global.ErrorCode = Include('/libs/errorCode');
        global.Util = Include('/libs/util');
        global.SnowFlake = {next: fp.constant(1)};
    });

    it('should pass correct option while querying room contracts', async function () {
        const req = {
            params: {
                projectId: 100,
                roomId: 200
            },
            query: {}
        };
        const sequelizeFindSpy = stub().resolves([]);
        const Users = {id: 100};
        global.MySQL = {
            Contracts: {
                findAndCountAll: sequelizeFindSpy,
            },
            Users,
        };

        await get(req, {send: fp.noop}).then(() => {
            sequelizeFindSpy.should.have.been.called;
            const countingOption = sequelizeFindSpy.getCall(0).args[0];
            countingOption.where.should.be.eql({
                roomId: req.params.roomId,
                status: 'ONGOING',
                projectId: req.params.projectId
            });
        });
    });
});