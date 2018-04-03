'use strict';
const fp = require('lodash/fp');
const config = require('config');
const moment = require('moment');

exports.iOSKey = '24833443';
exports.androidKey = '24832995';

exports.topupNotification = sequelizeModel => topup => {
    return sequelizeModel.Users.findById(topup.userId, {
        include: [
            {
                model: sequelizeModel.Auth, required: true, include: [
                    {model: sequelizeModel.Bindings, required: true},
                ],
            }],
    }).then(user => user ? user.toJSON() : {}).then(user => {
        const platform = fp.get('auth.binding.platform')(user);
        const targetId = fp.get('auth.binding.deviceId')(user);

        if (!platform || !targetId) return;
        const title = '充值成功提醒';
        const content = `用户${user.name}您好，\n${moment().format('YYYY年M月D日hh:mm')}您成功充值${topup.amount}元，当前您的充值账户余额为${topup.balance}元。`;
        const extras = JSON.stringify({
            userId: user.id,
            url: 'http://testzft.cloudenergy.me/',
        });

        exports.notificationOf(platform)({
            targetId,
            title,
            content,
            extras,
        });
    },
    );

};

exports.monthlyBillNotification = sequelizeModel => bill => {
    return sequelizeModel.Users.findById(bill.userId, {
        include: [
            {
                model: sequelizeModel.Auth, required: true, include: [
                    {model: sequelizeModel.Bindings, required: true},
                ],
            }],
    }).then(user => user ? user.toJSON() : {}).then(user => {
        const platform = fp.get('auth.binding.platform')(user);
        const targetId = fp.get('auth.binding.deviceId')(user);

        if (!platform || !targetId) return;
        const start = moment().unix(bill.startDate).format('YYYY-MM-DD');
        const end = moment().unix(bill.endDate).format('YYYY-MM-DD');
        const title = '账单逾期';
        const content = `您到账单已逾期，账期${start}至${end}，金额${bill.dueAmount/100}元。逾期将产生滞纳金，请立刻支付。`;
        const extras = JSON.stringify({
            userId: user.id,
            url: 'http://testzft.cloudenergy.me/',
        });

        exports.notificationOf(platform)({
            targetId,
            title,
            content,
            extras,
        });
    },
    );

};

exports.notificationOf = platform => body => {
    if (!fp.includes(platform)(['ios', 'android'])) return;
    const ApnsEnv = fp.getOr('PRODUCT')('ALICLOUD.ApnsEnv')(config);
    const Target = 'DEVICE';
    const refinedBody = {
        TargetValue: body.targetId,
        Title: body.title,
        Body: body.content,
        ExtParameters: body.extras,
    };
    platform === 'ios' ?
        Notifications.pushNoticeToiOS(fp.defaults(refinedBody)({
            AppKey: exports.iOSKey,
            Target,
            ApnsEnv,
        }), (err, result) => {
            console.log(err, result);
        }) :
        Notifications.pushNoticeToAndroid(fp.defaults(refinedBody)({
            AppKey: exports.androidKey,
            Target,
        }), (err, result) => {
            console.log(err, result);
        });
};