'use strict';

const schedule = require('node-schedule');
const moment = require('moment');
const fp = require('lodash/fp');
const {
    overdueBillNotification,
    lowBalanceNotification,
    negativeBalanceNotification,
    powerOffNotification,
    billNotification,
} = require('../services/v1.0/pushService');
const {smsForBillOverdue} = require('../services/v1.0/smsService');

const rule = new schedule.RecurrenceRule();
rule.hour = 8;
rule.minute = 0;

exports.job = () => schedule.scheduleJob(rule, async () => {
    console.log(`Daily user notifications process, start from ${moment().
        format('YYYY-MM-DD hh:mm:ss')}`);
    return Promise.all([
        billOverdue(),
        billDue(),
        lowBalance(),
        negativeBalance(),
        powerOffAlert(),
    ]);
});

const billOverdue = async () => {
    const bills = await MySQL.Bills.findAll({
        where: {
            dueDate: {
                $lt: moment().unix(),
            },
        },
    });
    console.log(`Overdue bill ids: ${fp.map(fp.get('dataValues.id'))(bills)}`);
    fp.each(b => {
        const bill = b.toJSON();
        console.log('original bill', bill);
        const billWithUserId = fp.defaults(bill)({userId: fp.get('user.id')(bill)});
        overdueBillNotification(MySQL)(
            billWithUserId);
        smsForBillOverdue(MySQL)(billWithUserId)
    })(bills);
};

const billDue = async () => {
    const bills = await MySQL.Bills.findAll({
        where: {
            dueDate: {
                $gt: moment().hour(0).minute(0).unix(),
                $lt: moment().hour(23).minute(59).unix(),
            },
        },
    });
    console.log(`Due bill ids: ${fp.map(fp.get('dataValues.id'))(bills)}`);
    fp.each(b => {
        const bill = b.toJSON();
        billNotification(MySQL)(
            fp.defaults(bill)({userId: fp.get('user.id')(bill)}));
    })(bills);
};

const lowBalance = async () => {
    const balance = await MySQL.CashAccount.findAll({
        where: {
            balance: {
                $lt: 2000,
                $gte: 0,
            },
        },
    });
    console.log(
        `Low balance ids: ${fp.map(fp.get('dataValues.userId'))(balance)}`);
    fp.each(b => {
        const cashAccount = b.toJSON();
        lowBalanceNotification(MySQL)(cashAccount);
    })(balance);
};

const negativeBalance = async () => {
    const balance = await MySQL.CashAccount.findAll({
        where: {
            balance: {
                $lt: 0,
                $gt: -2000,
            },
        },
    });
    console.log(`Negative balance ids: ${fp.map(fp.get('dataValues.userId'))(
        balance)}`);
    fp.each(b => {
        const cashAccount = b.toJSON();
        negativeBalanceNotification(MySQL)(cashAccount);
    })(balance);
};

const powerOffAlert = async () => {
    const balance = await MySQL.CashAccount.findAll({
        where: {
            balance: {
                $lt: -2000
            },
        },
    });
    console.log(`Power off alerting ids: ${fp.map(fp.get('dataValues.userId'))(
        balance)}`);
    fp.each(b => {
        const cashAccount = b.toJSON();
        powerOffNotification(MySQL)(cashAccount);
    })(balance);
};

