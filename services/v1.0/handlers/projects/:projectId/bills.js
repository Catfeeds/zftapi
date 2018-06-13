'use strict';
/**
 * Operations on /bills
 */
const fp = require('lodash/fp');
const moment = require('moment');
const {
  omitSingleNulls, innerValues,
  singleRoomTranslate, includeContracts,
} = require('../../../common');
const {fundFlowConnection, paymentsFilter} = require('../../../models');

const omitFields = fp.omit(['metadata', 'createdAt', 'updatedAt']);
const formatRoom = item => fp.defaults(item)(
  {room: singleRoomTranslate(item.contract.dataValues.room)});

const formatUser = item => fp.defaults(item)({
  user: fp.pick(['accountName', 'name', 'id', 'mobile'])(item.contract.user),
});

const formatContract = item => fp.defaults(item)({
  contract: fp.pick(['id', 'from', 'to'])(item.contract),
});

const pickUpFirstPayment = bill => fp.defaults(bill)(
  {payments: fp.take(1)(bill.payments)});

const translate = (models, pagingInfo) => {
  const single = fp.pipe(innerValues, omitSingleNulls, formatRoom, formatUser,
    formatContract, omitFields, pickUpFirstPayment);
  return {
    paging: {
      count: models.count,
      index: pagingInfo.index,
      size: pagingInfo.size,
    },
    data: fp.map(single)(models.rows),
  };
};

module.exports = {
  get: async function(req, res) {
    const Bills = MySQL.Bills;
    const BillFlows = MySQL.BillFlows;
    const BillPayment = MySQL.BillPayment;

    const contractFilter = includeContracts(MySQL);

    const {
      houseFormat, locationId, index: pageIndex, size: pageSize,
      from, to, manager,
    } = req.query;

    const now = moment().unix();
    if (to < from || from > now ) {
      return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
        {error: 'please provide valid from / to timestamp.'}));
    }

    const projectId = req.params.projectId;
    const locationCondition = locationId ? {where: {id: locationId}} : null;

    const paidFilter = paymentsFilter(MySQL)(fp.get('query.paid')(req),
      projectId);
    const pagingInfo = Util.PagingInfo(pageIndex, pageSize, true);

    const billOptions = {
      include: [
        {
          model: BillFlows,
          required: true,
          as: 'billItems',
          attributes: ['configId', 'amount', 'createdAt', 'id'],
        }, {
          model: BillPayment,
          required: false,
          as: 'payments',
          attributes: [
            'id',
            'amount',
            'fundChannelId',
            'operator',
            'paidAt',
            'remark',
            'status'],
        },
        contractFilter(houseFormat, undefined, locationCondition),
        fundFlowConnection(MySQL)()],
      distinct: true,
      where: fp.extendAll([
        {
          entityType: 'property',
          projectId,
          $or: [
            {
              startDate: {
                $lt: now,
              },
            },
            {
              dueDate: {
                $lt: now,
              },
            },
          ],
        },
        from && to ?
          {
            dueDate: {
              $lte: Number(to),
              $gte: Number(from),
            },
          } : {},
        fp.isEmpty(paidFilter) ? {} : {
          id: paidFilter,
        },
        manager ? {
          '$contract.room.house.houseKeeper$' : manager
        }: {}
      ]),
      offset: pagingInfo.skip,
      limit: pagingInfo.size,
    };
    return Bills.findAndCountAll(billOptions).
      then(models => translate(models, pagingInfo)).
      then(bills => res.send(bills)).
      catch(err => res.send(500,
        ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
  },
};
