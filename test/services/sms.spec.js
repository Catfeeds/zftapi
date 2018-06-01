'use strict';

const {sendSMS} = require('../../libs/sms');

describe('Aliyun SMS', function() {
    before(() => {
        global.log = console;
    });

    it('should be able to call remote api service', async () => {
        const err = await sendSMS('xxxxxxxx', 'SMS_122125098', {'customer': 'fenger'});
        err.code.should.be.oneOf(['InvalidAccessKeyId.NotFound', 'isv.MOBILE_NUMBER_ILLEGAL']);
    });
});

