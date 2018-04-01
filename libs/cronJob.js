'use strict';

const schedule = require('node-schedule');
const moment = require('moment');
const fp = require('lodash/fp');
const {monthlyBillNotification} = require('../services/v1.0/pushService');

const rule = new schedule.RecurrenceRule();
rule.minute = 5;

exports.job = () => schedule.scheduleJob(rule, async () => {
    console.log(`Monthly user bills notifications, start from ${moment().format('YYYY-MM-DD hh:mm:ss')}`);
    const users = await MySQL.Users.findAll();
    fp.each(u => {
        const user = u.toJSON();
        monthlyBillNotification(MySQL)(user)
    })(users);

});
