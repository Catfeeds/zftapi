'use strict';

const {get} = require(
    '../../services/v1.0/handlers/projects/:projectId/users/:userId');
require('include-node');
const {spy} = require('sinon');

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
});