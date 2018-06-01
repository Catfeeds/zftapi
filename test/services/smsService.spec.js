'use strict';

const {smsForBillOverdue, smsForNewContract} = require(
    '../../services/v1.0/smsService');
require('include-node');
const {stub} = require('sinon');

describe('smsService', function() {
    beforeEach(() => {
        global.log = console;
    });
    describe('when creating new contract', () => {
        it('should be able to send out sms', async () => {
            global.ShortMessage = stub().resolves({Code: 'OK'});

            await smsForNewContract('projectName', 'number', 'username');

            ShortMessage.should.have.been.called;
            const smsSent = ShortMessage.getCall(0).args[0];
            smsSent.should.be.eql({
                number: 'number',
                params: {
                    account: 'username',
                    passwd: '123456',
                    project: 'projectName',
                },
                template: 'SMS_136380435',
            });

        });
        it('should be able to block if no number provided', async () => {
            global.ShortMessage = stub().resolves({Code: 'OK'});

            await smsForNewContract('projectName', undefined, 'username');

            ShortMessage.should.not.have.been.called;
        });
    });
    describe('when bills are overdue', function() {
        it('should be able to send out sms', async () => {
            global.ShortMessage = stub().resolves({Code: 'OK'});

            const SequelizeModels = {
                Users: {
                    findById: async () => ({
                        toJSON: () => ({
                            auth: {
                                mobile: 'mobile',
                            },
                        }),
                    }),
                },
            };
            await smsForBillOverdue(SequelizeModels)(
                {userId: 'userId', dueAmount: 9999});

            ShortMessage.should.have.been.called;
            const smsSent = ShortMessage.getCall(0).args[0];
            smsSent.should.be.eql({
                number: 'mobile',
                params: {
                    amount: '99.99'
                },
                template: 'SMS_136385466',
            });

        });
        it('should be able to block if no number provided', async () => {
            global.ShortMessage = stub().resolves({Code: 'OK'});

            const SequelizeModels = {
                Users: {
                    findById: async () => ({
                        toJSON: () => ({}),
                    }),
                },
            };

            await smsForBillOverdue(SequelizeModels)(
                {userId: 'userId', dueAmount: 9999});

            ShortMessage.should.not.have.been.called;

        });

    });

});