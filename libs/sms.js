'use strict';
const fp = require('lodash/fp');
const config = require('config');
const SMSClient = require('@alicloud/sms-sdk');

const accessKeyId = fp.get('ALICLOUD.key')(config);
const secretAccessKey = fp.get('ALICLOUD.secret')(config);

const smsClient = new SMSClient({accessKeyId, secretAccessKey});

const SignName =  '电小鸽';
const passwd = '123456';

/*
* 模版CODE:
SMS_136380435
模版内容:
您的${project}账号：${account}，密码：${passwd}关注公众号电小鸽或者下载电小鸽APP使用！
*/
exports.smsForNewContract = (projectName = '公寓合约', number, username) => {
    return smsClient.sendSMS({
        PhoneNumbers: number,
        SignName,
        TemplateCode: 'SMS_136380435',
        TemplateParam: JSON.stringify({account: username, passwd, project: projectName}),
    }).then(res => {
        const {Code} = res;
        if (Code === 'OK') {
            console.log('new user notification sent successfully.', number, res);
        } else {
            log.warn('new user notification sent failed.', number, res);
        }
    }).catch(err => console.log(`error in sending sms 'SMS_121906657' to ${number} with ${info}`, err));
};

/*
* 模版CODE:
SMS_136385466
模版内容:
您公寓有${amount}元房租账单已逾期，系统将会停止供电服务。请关注公众号电小鸽或者下载电小鸽APP完成账单支付。
*/
exports.smsForBillOverdue = (number, info) => {
    return smsClient.sendSMS({
        PhoneNumbers: number,
        SignName,
        TemplateCode: 'SMS_136385466',
        TemplateParam: JSON.stringify(info),
    }).then(res => {
        const {Code} = res;
        if (Code === 'OK') {
            log.info('overdue warning sent successfully.', number,  res);
        } else {
            log.warn('overdue warning sent failed.', number, res);
        }
    }).catch(err => console.log(`error in sending sms 'SMS_121906657' to ${number} with ${info}`, err));
};