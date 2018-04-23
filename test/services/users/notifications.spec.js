'use strict';

const {get} = require(
    '../../../services/v1.0/handlers/projects/:projectId/users/:userId/notifications');
const {spy} = require('sinon');

describe('User notification history', () => {
    before(() => {
        global.Util = Include('/libs/util');
    });
    it('should record all notifications', async () => {
        const req = {
            params: {
                projectId: 100,
                userId: 123,
            },
            query: {},
        };
        global.MySQL = {
            UserNotifications: {
                findAndCountAll: async () => ({
                    count: 1,
                    rows: [
                        {
                            toJSON: () => ({
                                id: 123,
                                userId: 321,
                                title: 'title',
                                content: 'content',
                            }),
                        }],
                }),
            },
        };
        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
            resSpy.should.have.been.called;
            resSpy.getCall(0).args[0].should.be.eql({
                paging: {
                    count: 1,
                    index: 1,
                    size: 10,
                },
                data: [
                    {
                        id: 123,
                        userId: 321,
                        title: 'title',
                        content: 'content',
                    }],
            });
        });
    });
});