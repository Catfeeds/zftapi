'use strict';

exports.fundFlowConnection = (sequelizeModel) => () => ({
    model: sequelizeModel.FundChannelFlows,
    required: false,
    attributes: ['id', 'category', 'orderNo', 'from', 'to', 'amount'],
});