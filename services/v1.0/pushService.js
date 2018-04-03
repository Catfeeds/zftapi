'use strict';
const fp = require('lodash/fp');
const config = require('config');
const moment = require('moment');

exports.iOSKey = '24833443';
exports.androidKey = '24832995';

exports.topupNotification =
    sequelizeModel => topup => exports.commonNotification(sequelizeModel)({
        userId: topup.userId,
        titleOf: fp.constant('充值成功提醒'),
        contentOf: user => `用户${user.name}您好，\n${moment().
            format(
                'YYYY年M月D日hh:mm')}您成功充值${topup.amount}元，当前您的充值账户余额为${topup.balance}元。`,
        extrasOf: exports.commonExtra,
    });

exports.overdueBillNotification = sequelizeModel => bill => {
    const start = moment(bill.startDate * 1000).format('YYYY-MM-DD');
    const end = moment(bill.endDate * 1000).format('YYYY-MM-DD');
    return exports.commonNotification(sequelizeModel)({
        userId: bill.userId,
        titleOf: fp.constant('账单逾期'),
        contentOf: fp.constant(`您的账单已逾期，账期${start}至${end}，金额${bill.dueAmount / 100}元。逾期将产生滞纳金，请立刻支付。`),
        extrasOf: exports.commonExtra,
    });
};

exports.lowBalanceNotification =
    sequelizeModel => cashAccount => exports.commonNotification(sequelizeModel)(
        {
            userId: cashAccount.userId,
            titleOf: fp.constant('余额不足提醒'),
            contentOf: fp.constant(`截止${moment().
                hours(8).
                minute(0).
                format(
                    'YYYY年M月D日hh:mm')}，您的账户余额已少于20元，为避免系统自动停电给您生活带来不便，请及时充值。`),
            extrasOf: exports.commonExtra,
        });

exports.negativeBalanceNotification =
    sequelizeModel => cashAccount => exports.commonNotification(sequelizeModel)(
        {
            userId: cashAccount.userId,
            titleOf: fp.constant('欠费通知'),
            contentOf: fp.constant(`截止${moment().
                hours(8).
                minute(0).
                format(
                    'YYYY年M月D日hh:mm')}，您的账户已欠费${-cashAccount.balance/100}元，为避免停电给您生活带来不便，请及时充值。`),
            extrasOf: exports.commonExtra,
        });

exports.commonNotification = sequelizeModel => notification => {
    return sequelizeModel.Users.findById(notification.userId, {
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
        const title = notification.titleOf(user);
        const content = notification.contentOf(user);
        const extras = notification.extrasOf(user);

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

exports.commonExtra = user => JSON.stringify({
    userId: user.id,
    url: 'http://testzft.cloudenergy.me/',
});