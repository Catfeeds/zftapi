'use strict';
require('include-node');
const {allowToCreateCredentials, allowToResetPassword} = require('../../auth/access');

describe('Access', function () {
    before(() => {
        global.Typedef = Include('/libs/typedef');
    });
    it('should allow admin to create credentials', function () {
        const req = {isAuthenticated: () => true, user: {level: 'admin'}};

        allowToCreateCredentials(req).should.be.true;
    });

    it('should not allow manager to create credentials', function () {
        const req = {isAuthenticated: () => true, user: {level: 'manager'}};

        allowToCreateCredentials(req).should.not.be.true;
    });

    it('should not allow other user level to create credentials', function () {
        const req = {isAuthenticated: () => true, user: {level: 'randomLevel'}};

        allowToCreateCredentials(req).should.not.be.true;
    });

    it('should not allow unknown user to create credentials', function () {
        const req = {isAuthenticated: () => true};

        allowToCreateCredentials(req).should.not.be.true;
    });

    it('should not allow unauthenticated user to create credentials', function () {
        const req = {isAuthenticated: () => false, user: {level: 'admin'}};

        allowToCreateCredentials(req).should.not.be.true;
    });

    it('should not allow anyone to create credentials by default', function () {
        const req = {};

        allowToCreateCredentials(req).should.not.be.true;
    });

    it('should allow manager to reset password', function () {
        const req = {isAuthenticated: () => true, user: {level: 'manager'}};

        allowToResetPassword(req).should.be.true;
    });

    it('should not allow user to reset password', function () {
        const req = {isAuthenticated: () => true, user: {level: 'user'}};

        allowToResetPassword(req).should.be.false;
    });
});
