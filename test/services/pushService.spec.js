'use strict';

const {notificationOf} = require('../../services/v1.0/pushService');
require('include-node');
const {stub} = require('sinon');

describe('pushService', function () {
    describe('notification', function () {
        it('should be able to push to ios', () => {
            global.Notifications = {
                pushNoticeToAndroid: stub(),
                pushNoticeToiOS: stub()
            };
            notificationOf('ios')({});
            Notifications.pushNoticeToiOS.should.have.been.called;
            Notifications.pushNoticeToAndroid.should.not.have.been.called;
        });
        it('should be able to push to android', () => {
            global.Notifications = {
                pushNoticeToAndroid: stub(),
                pushNoticeToiOS: stub()
            };
            notificationOf('android')({});
            Notifications.pushNoticeToiOS.should.not.have.been.called;
            Notifications.pushNoticeToAndroid.should.have.been.called;
        });
        it('should do nothing if no platform valid', () => {
            global.Notifications = {
                pushNoticeToAndroid: stub(),
                pushNoticeToiOS: stub()
            };
            notificationOf('')({});
            Notifications.pushNoticeToiOS.should.not.have.been.called;
            Notifications.pushNoticeToAndroid.should.not.have.been.called;
        });
    });
});