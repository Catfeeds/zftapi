'use strict';

const fp = require('lodash/fp');

exports.fundFlowConnection = (sequelizeModel) => (required = false) => ({
    required,
    model: sequelizeModel.FundChannelFlows,
    attributes: [
        'id',
        'category',
        'orderNo',
        'from',
        'to',
        'amount',
        'createdAt'],
});

exports.paymentsFilter = sequelizeModel => (flag, projectId) => {
    if (fp.isUndefined(flag)) {
        return {};
    }
    const billPaymentFilter = sequelizeModel.Sequelize.literal(
        `( select billId from billpayment where projectId = ${projectId} )`);
    return flag === 'true' ?
        {$in: billPaymentFilter}
        : {$notIn: billPaymentFilter};
};