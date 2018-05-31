'use strict';
const fp = require('lodash/fp');
const config = require('config');
const SMSClient = require('@alicloud/sms-sdk');

const accessKeyId = fp.get('ALICLOUD.key')(config);
const secretAccessKey = fp.get('ALICLOUD.secret')(config);
//初始化sms_client
const smsClient = new SMSClient({accessKeyId, secretAccessKey});
//发送短信

exports.sendSMS = (number, info) => {
    return smsClient.sendSMS({
        PhoneNumbers: number,
        SignName: '电小鸽',
        TemplateCode: 'SMS_121906657',
        TemplateParam: JSON.stringify(info),
    }).then(res => {
        const {Code} = res;
        console.log(res);
        if (Code === 'OK') {
            console.log('sent success.');
        }
    }).catch(err => console.log(err));
}
