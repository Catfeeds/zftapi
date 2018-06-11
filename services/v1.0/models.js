'use strict';

const fp = require('lodash/fp');
const {FundChannelStatus} = require('../../libs/typedef');

exports.fundFlowConnection = (sequelizeModel) => (required = false) => ({
  required,
  model: sequelizeModel.FundChannelFlows,
  attributes: [
    'id',
    'fundChannelId',
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

exports.fundChannelById = SequelizeModels => async ({projectId, fundChannelId}) => {
  return SequelizeModels.ReceiveChannels.findOne({
    where: {
      fundChannelId,
    },
    attributes: ['fee', 'setting', 'share'],
    include: [
      {
        model: SequelizeModels.FundChannels,
        as: 'fundChannel',
        where: {
          status: FundChannelStatus.PASSED,
          projectId,
        },
        attributes: [
          'category',
          'flow',
          'name',
          'tag',
          'id'],
        include: [
          {
            model: SequelizeModels.ServiceCharge,
            as: 'serviceCharge',
          },
        ],
      },
    ],
  });
};