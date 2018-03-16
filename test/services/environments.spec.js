'use strict';

const {get} = require('../../services/v1.0/handlers/environments');
require('include-node');
const {spy} = require('sinon');

describe('Environments', function () {
    before(() => {
        global.Typedef = Include('/libs/typedef');
    });
    it('should return constants of zft project', async function () {
        const req = {isAuthenticated: () => false};
        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
            const response = resSpy.getCall(0).args[0];
            response.should.shallowDeepEqual({
                length: 4,
                0: {key: 'houseFormat'},
                1: {key: 'roomType'},
                2: {key: 'operationStatus'},
                3: {key: 'orientation'},
            });
        });
    });

    it('should return user info while user logged in', async function () {
        const user = {projectId: 99};
        const banks = [{tag: 'alipay', name: '支付宝'}];
        const req = {isAuthenticated: () => true, user};

        global.MySQL = {
            Auth: {
                findById: async () => ({dataValues: user}),
            },
            Banks: {
                findAll: async () => {return banks;},
            }
        };

        const resSpy = spy();

        await get(req, {send: resSpy}).then(() => {
            const response = resSpy.getCall(0).args[0];
            console.log(response);
            response.should.shallowDeepEqual({
                length: 6,
                0: {key: 'houseFormat'},
                1: {key: 'roomType'},
                2: {key: 'operationStatus'},
                3: {key: 'orientation'},
                4: {key: 'user', value: user},
                5: {key: 'banks', value: banks},
            });
        });
    });
});