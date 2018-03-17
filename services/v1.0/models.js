'use strict';

const fp = require('lodash/fp');

exports.fundFlowConnection = (sequelizeModel) => (isJoin) => (
    fp.assign(
        {
            model: sequelizeModel.FundChannelFlows,
            attributes: ['id', 'category', 'orderNo', 'from', 'to', 'amount', 'createdAt'],
        },
        isJoin ? {required: true}:{required: false}
    )
);