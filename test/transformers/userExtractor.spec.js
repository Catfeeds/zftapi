'use strict';

const fp = require('lodash/fp');
const {extract, extractAuth} = require('../../transformers/userExtractor');

describe('extractUser', () => {
    before(() => {
        global.SnowFlake = {next: fp.constant(1999)};
    });
    it('should extract user from request', async () => {
        const user = {
            name: 'Abraham',
            accountName: 'accountName',
            mobile: '12345678911',
            documentId: '12345678911',
            documentType: 1,
            gender: 'M',

        };
        const req = {body: {user}};
        extract(req).should.be.eql(fp.defaults({id: 1999})(user));
    });

    it('should extract auth from request', async () => {
        const user = {
            name: 'Abraham',
            accountName: 'accountName',
            mobile: '12345678911',
            documentId: '12345678911',
            documentType: 1,
            gender: 'M',
        };
        const req = {params: {projectId: 100}, body: {user}};
        await extractAuth(req).then(data => {
            data.should.be.eql({
                email: undefined,
                id: 1999,
                level: 'USER',
                mobile: '12345678911',
                password: 'e10adc3949ba59abbe56e057f20f883e',
                'projectId': 100,
                username: 'accountName',

            });
        },
        );
    });
    it('should be able to handle number in mobile while extracting auth', async () => {
        const user = {
            name: 'Abraham',
            accountName: 'accountName',
            mobile: 12345678911,
            documentId: '12345678911',
            documentType: 1,
            gender: 'M',
        };
        const req = {params: {projectId: 100}, body: {user}};
        await extractAuth(req).then(data => {
            data.should.be.eql({
                email: undefined,
                id: 1999,
                level: 'USER',
                mobile: 12345678911,
                password: 'e10adc3949ba59abbe56e057f20f883e',
                'projectId': 100,
                username: 'accountName',

            });
        },
        );
    });
});