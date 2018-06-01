'use strict';
const fp = require('lodash/fp');
const config = require('config');

const SMSClient = require('@alicloud/sms-sdk');

const accessKeyId = fp.get('ALICLOUD.key')(config);
const secretAccessKey = fp.get('ALICLOUD.secret')(config);

const smsClient = new SMSClient({accessKeyId, secretAccessKey});

const SignName = '电小鸽';

exports.sendSMS = async (number, template, params) => smsClient.sendSMS({
    PhoneNumbers: number,
    SignName,
    TemplateCode: template,
    TemplateParam: JSON.stringify(params),
}).catch(err => {
    log.warn(
        `error in sending sms ${template} to ${number} with ${JSON.stringify(
            params)}`,
        err);
    return err;
});