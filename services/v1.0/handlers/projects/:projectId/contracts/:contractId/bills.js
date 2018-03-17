'use strict';
/**
 * Operations on /contracts/{contractid}/bills
 */

const fp = require('lodash/fp');
const {clearUpFields: removeNullValues} = require(
    '../../../../../../../transformers/billItemsCleaner');
const {fundFlowConnection, paymentsFilter} = require('../../../../../models');
const {mysqlDateTimeToStamp} = require('../../../../../common');
const innerValues = model => model.toJSON();
const translate = bills => {
    const timeConvert = payment => fp.defaults(payment)(
        {createdAt: mysqlDateTimeToStamp(payment.createdAt)});
    const fundChange = bill => fp.defaults(
        {payments: fp.map(timeConvert)(bill.fundChannelFlows)})(bill);
    const flow = fp.pipe(innerValues, removeNullValues, fundChange,
        fp.omit('fundChannelFlows'));
    return fp.map(flow)(bills);
};

module.exports = {
    get: async (req, res) => {
        const Bills = MySQL.Bills;
        const BillFlows = MySQL.BillFlows;
        const projectId = req.params.projectId;

        const paidFilter = paymentsFilter(MySQL)(fp.get('query.paid')(req), projectId);

        return Bills.findAll({
            include: [
                {
                    model: BillFlows,
                    as: 'billItems',
                    attributes: [
                        'configId',
                        'relevantId',
                        'amount',
                        'createdAt',
                        'id'],
                },
                fundFlowConnection(MySQL)()],
            where: fp.defaults({
                entityType: 'property',
                contractId: req.params.contractId,
                projectId,
            })(fp.isEmpty(paidFilter) ? {} : {
                id: paidFilter
            }),
        }).
            then(translate).
            then(bills => res.send(bills)).
            catch(err => res.send(500,
                ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    },
};
