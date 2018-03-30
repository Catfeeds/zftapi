'use strict';

const {notificationOf, androidKey, iOSKey} = require(
    '../../services/v1.0/pushService');
require('include-node');
const {stub} = require('sinon');

describe('pushService', function() {
    beforeEach(() => {
        global.Notifications = {
            pushNoticeToAndroid: stub(),
            pushNoticeToiOS: stub(),
        };
    });
    describe('notification', function() {
        it('should be able to push to ios', () => {
            notificationOf('ios')({
                content: 'body',
                title: 'title',
                extras: 'extras',
                targetId: 'targetId',
            });
            Notifications.pushNoticeToiOS.should.have.been.called;
            Notifications.pushNoticeToAndroid.should.not.have.been.called;
            const iOSPushes = Notifications.pushNoticeToiOS.getCall(0).args[0];
            iOSPushes.should.be.eql({
                ApnsEnv: 'PRODUCT',
                AppKey: iOSKey,
                Body: 'body',
                ExtParameters: 'extras',
                Target: 'DEVICE',
                TargetValue: 'targetId',
                Title: 'title',
            });
        });
        it('should be able to push to android', () => {
            notificationOf('android')({
                content: 'body',
                title: 'title',
                extras: 'extras',
                targetId: 'targetId',
            });
            Notifications.pushNoticeToiOS.should.not.have.been.called;
            Notifications.pushNoticeToAndroid.should.have.been.called;
            const androidPushes = Notifications.pushNoticeToAndroid.getCall(
                0).args[0];
            androidPushes.should.be.eql({
                AppKey: androidKey,
                Body: 'body',
                ExtParameters: 'extras',
                Target: 'DEVICE',
                TargetValue: 'targetId',
                Title: 'title',
            });
        });
        it('should do nothing if no platform provided', () => {
            notificationOf('')({});
            Notifications.pushNoticeToiOS.should.not.have.been.called;
            Notifications.pushNoticeToAndroid.should.not.have.been.called;
        });

        it('should do nothing if no platform valid', () => {
            notificationOf('random')({});
            Notifications.pushNoticeToiOS.should.not.have.been.called;
            Notifications.pushNoticeToAndroid.should.not.have.been.called;
        });
    });
});