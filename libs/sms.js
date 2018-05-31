'use strict';
const fp = require('lodash/fp');
const config = require('config');
const SMSClient = require('@alicloud/sms-sdk');

const accessKeyId = fp.get('ALICLOUD.key')(config);
const secretAccessKey = fp.get('ALICLOUD.secret')(config);

const smsClient = new SMSClient({accessKeyId, secretAccessKey});

exports.smsForNewContract = (number, info) => {
    return smsClient.sendSMS({
        PhoneNumbers: number,
        SignName: '电小鸽',
        TemplateCode: 'SMS_121906657',
        TemplateParam: JSON.stringify(info),
    }).then(res => {
        const {Code} = res;
        if (Code === 'OK') {
            console.log('sent success.', res);
        }
    }).catch(err => console.log(`error in sending sms 'SMS_121906657' to ${number} with ${info}`, err));
}
