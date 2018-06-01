'use strict';
const fp = require('lodash/fp');

const passwd = '123456';

/*
* 模版CODE:
SMS_136380435
模版内容:
您的${project}账号：${account}，密码：${passwd}关注公众号电小鸽或者下载电小鸽APP使用！
*/
exports.smsForNewContract = (projectName = '公寓合约', number, username) => {
    if (fp.isEmpty(number)) {
        log.warn(`No mobile number left for user ${username}`);
        return;
    }
    return ShortMessage({
        number,
        template: 'SMS_136380435',
        params: {account: username, passwd, project: projectName},
    }).then(res => {
        const {Code} = res;
        if (Code === 'OK') {
            console.log('new user notification sent successfully.', number,
                res);
        } else {
            log.warn('new user notification sent failed.', number, res);
        }
    });
};

/*
* 模版CODE:
SMS_136385466
模版内容:
您公寓有${amount}元房租账单已逾期，系统将会停止供电服务。请关注公众号电小鸽或者下载电小鸽APP完成账单支付。
*/
exports.smsForBillOverdue = MySQL => async ({userId, dueAmount}) => {
    const number = await MySQL.Users.findById(userId,
        {
            attributes: ['id'], include: [
                {
                    model: MySQL.Auth,
                    attributes: ['mobile'],
                }],
        }).then(j => j.toJSON()).then(fp.get('auth.mobile'));
    const amount = Number(dueAmount / 100).toFixed(2);
    if (fp.isEmpty(number)) {
        log.warn(`No mobile number left for user ${userId}`);
        return;
    }

    return ShortMessage({
        number,
        template: 'SMS_136385466',
        params: {amount},
    }).
        then(res => {
            const {Code} = res;
            if (Code === 'OK') {
                log.info('overdue warning sent successfully.', number, res);
            } else {
                log.warn('overdue warning sent failed.', number, res);
            }
        });
};