'use strict';
const fp = require('lodash/fp');
const config = require('config');
const ALY = require('aliyun-sdk');

const push = new ALY.PUSH({
    accessKeyId: fp.get('ALICLOUD.key')(config),
    secretAccessKey: fp.get('ALICLOUD.secret')(config),
    endpoint: 'http://cloudpush.aliyuncs.com',
    apiVersion: '2016-08-01',
},
);

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
        const TargetValue = fp.get('auth.binding.deviceId')(user);

        if (!platform || !TargetValue) return;
        const Title = '充值成功提醒';
        const Body = `用户${user.name}您好，\n2016年5月7日10:59您成功充值${topup.amount}元，当前您的充值账户余额为${topup.balance}元。`;
        const ExtParameters = JSON.stringify({
            userId: user.id,
            url: 'http://testzft.cloudenergy.me/'
        });

        platform === 'ios' ? push.pushNoticeToiOS(fp.defaults({
            ApnsEnv: 'PRODUCT',
            Target: 'DEVICE',
            TargetValue,
            Title,
            Body,
            ExtParameters,
        })({AppKey: exports.iOSKey}), (err, result) => {
            console.log(err, result);
        }) :
            push.pushNoticeToAndroid(fp.defaults({
                Target: 'DEVICE',
                TargetValue,
                Title,
                Body,
                ExtParameters,
            })({AppKey: exports.androidKey}), (err, result) => {
                console.log(err, result);
            });

    },
    );

};
exports.iOSKey = '24833443';
exports.androidKey = '24832995';