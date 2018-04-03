'use strict';

const schedule = require('node-schedule');
const moment = require('moment');
const fp = require('lodash/fp');
const {monthlyBillNotification} = require('../services/v1.0/pushService');

const rule = new schedule.RecurrenceRule();
rule.hour = 9;

exports.job = () => schedule.scheduleJob(rule, async () => {
    console.log(`Monthly user bills notifications, start from ${moment().format('YYYY-MM-DD hh:mm:ss')}`);
    return billOverdue();
});

const billOverdue = async () => {
    const bills = await MySQL.Bills.findAll({
        where: {
            dueDate: {
                $lt: moment().unix()
            }
        }});
    console.log(`Overdue bill ids: ${fp.map(fp.get('dataValues.id'))(bills)}`);
    fp.each(b => {
        const bill = b.toJSON();
        monthlyBillNotification(MySQL)(fp.defaults(bill)({userId: fp.get('user.id')(bill)}))
    })(bills);
}

