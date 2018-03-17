'use strict';
/**
 * Operations on /contracts/{contractid}/bills
 */

const fp = require('lodash/fp');
const {clearUpFields: removeNullValues} = require(
    '../../../../../../../transformers/billItemsCleaner');
const {fundFlowConnection} = require('../../../../../models');
const {mysqlDateTimeToStamp} = require('../../../../../common');
const innerValues = model => model.toJSON();
const translate = bills => {
    const timeConvert = payment => fp.defaults(payment)({createdAt: mysqlDateTimeToStamp(payment.createdAt)});
    const fundChange = bill => fp.defaults({payments: fp.map(timeConvert)(bill.fundChannelFlows)})(bill);
    const flow = fp.pipe(innerValues, removeNullValues, fundChange, fp.omit('fundChannelFlows'));
    return fp.map(flow)(bills);
};

module.exports = {
    get: function getContractBills(req, res) {

        (async()=>{
            const isPaid = Number( req.query.isPaid );

            const Bills = MySQL.Bills;
            const BillFlows = MySQL.BillFlows;

            const where = {
                entityType: 'property',
                contractId: req.params.contractId,
                projectId: req.params.projectId,
            };

            const query = async(where, inJoinFundFlow)=>{
                return await Bills.findAll({
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
                        fundFlowConnection(MySQL)(inJoinFundFlow)],
                    where: where,
                }).then(translate);
            };

            if(isNaN(isPaid)){
                try {
                    const data = await query(where, false);
                    res.send(data);
                }
                catch (e) {
                    res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
                }
            }
            else {
                if (!isPaid) {
                    try {
                        const bills = await query(where, true);
                        const billIds = fp.map(bill => {
                            return bill.id;
                        })(bills);

                        const data = await query(fp.assign(where, {id: {$notIn: billIds}}), false);
                        res.send(data);
                    }
                    catch (e) {
                        res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
                    }
                }
                else {
                    try {
                        const data = await query(where, true);
                        res.send(data);
                    }
                    catch (e) {
                        res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
                    }
                }
            }
        })();
    },
};
