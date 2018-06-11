'use strict';
const fp = require('lodash/fp');
const {iOSKey, androidKey} = require('../pushService');

module.exports = {
  post: async (req, res) => {
    const {platform, type} = req.query;
    // {
    //     "Target": "ALL",
    //     "TargetValue": "ALL",
    //     "Title": "nodejs ios message Title",
    //     "Body": "nodejs ios message  Body"
    // }
    if (platform === 'ios' && type === 'message') {
      return Notifications.pushMessageToiOS(fp.defaults(req.body)({AppKey: iOSKey}), function(err, result) {
        console.log(err, result);
        return res.send(200, {err, result});
      });
    }

    // {
    //     "ApnsEnv":"PRODUCT",
    //     "Target": "ALL",
    //     "TargetValue": "ALL",
    //     "Body": "nodejs notice Body",
    //     "ExtParameters": "{\"key1\":\"value1\",\"key2\":\"value2\"}"
    // }
    if (platform === 'ios' && type === 'notice') {
      return Notifications.pushNoticeToiOS(fp.defaults(req.body)({AppKey: iOSKey}), function (err, result) {
        console.log(err, result);
        return res.send(200, {err, result});
      });
    }

    // {
    //     "Target": "ALL",
    //     "TargetValue": "ALL",
    //     "Title": "nodejs android message Title",
    //     "Body": "nodejs android message  Body"
    // }

    if (platform === 'android' && type === 'message') {
      return Notifications.pushMessageToAndroid(fp.defaults(req.body)({AppKey: androidKey}), function(err, result) {
        console.log(err, result);
        return res.send(200, {err, result});
      });
    }

    // {
    //     "Target": "ALL",
    //     "TargetValue": "ALL",
    //     "Title": "android title",
    //     "Body": "nodejs android notice Title",
    //     "ExtParameters": "{\"id\":1002,\"content\":\"Push OpenAPI!\"}"
    // }
    //
    if (platform === 'android' && type === 'notice') {
      return Notifications.pushNoticeToAndroid(fp.defaults(req.body)({AppKey: androidKey}), function(err, result) {
        console.log(err, result);
        return res.send(200, {err, result});
      });
    }
    return res.send(200, {result: 'not sending anything.'});
  },
};