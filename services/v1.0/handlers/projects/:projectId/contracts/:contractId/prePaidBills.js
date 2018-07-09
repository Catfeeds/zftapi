'use strict'
/**
 * Operations on /contracts/{contractid}/bills
 */
const fp = require('lodash/fp')
const moment = require('moment')

module.exports = {
  get: async (req, res) => {
    const projectId = req.params.projectId
    const contractId = req.params.contractId
    const query = req.query

    if (!Util.ParameterCheck(query,
      ['mode'],
    )) {
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED))
    }

    const checkDate = (date) => {
      if (date) {
        const momentObj = moment.unix(date)
        if (!momentObj.isValid()) {
          return res.send(400,
            ErrorCode.ack(ErrorCode.PARAMETERERROR, {parameter: date}))
        }
      }
    }

    const startDate = parseInt(query.startDate)
    const endDate = parseInt(query.endDate)
    checkDate(query.startDate)
    checkDate(query.endDate)

    const group = query.group

    const dateFilter = (startDate, endDate) => {
      if (!startDate && !endDate) {
        return null
      }
      return fp.assignAll([
        startDate ? {$gte: startDate} : {}
        , endDate ? {$lte: endDate} : {},
      ])
    }

    const defaultPaging = !(startDate && endDate)
    const mode = query.mode
    const pagingInfo = Util.PagingInfo(query.index, query.size, defaultPaging)
    //
    switch (mode) {
    case 'topup': {
      return MySQL.Contracts.findOne({
        where: {
          id: contractId,
          status: Typedef.ContractStatus.ONGOING,
        },
      }).then(
        contract => {
          if (!contract) {
            return ErrorCode.ack(404, ErrorCode.CONTRACTNOTEXISTS)
          }

          const where = fp.extendAll([
            {
              projectId: projectId,
              userId: contract.userId,
            }
            ,
            dateFilter(startDate, endDate) ?
              {paymentDay: dateFilter(startDate, endDate)} :
              {},
          ])
          const options = fp.assign(
            {
              where: where,
              attributes: [
                'fundChannelId',
                'createdAt',
                'amount',
                'balance',
                'fee'],
              order: [['createdAt', 'DESC']],
              include: [
                {
                  model: MySQL.Auth,
                  as: 'operatorInfo',
                  required: false,
                  attributes: ['username'],
                }, {
                  model: MySQL.Users,
                  attributes: ['id'],
                  include: [
                    {
                      model: MySQL.Auth,
                      attributes: ['username'],
                    }],
                }],
            },
            {
              offset: pagingInfo.skip,
              limit: pagingInfo.size,
            },
          )

          return MySQL.Topup.findAndCountAll(options).then(
            result => {
              const fundChannelId = fp.map(row => {
                return row.fundChannelId
              })(result.rows)

              return MySQL.FundChannels.findAll({
                where: {
                  id: {$in: fundChannelId},
                },
                attributes: ['id', 'name'],
              }).then(
                fundChannels => {
                  const data = fp.map(row => ({
                    time: moment(row.createdAt).unix(),
                    amount: row.amount,
                    fee: row.fee,
                    balance: row.balance,
                    fundChannelName: fp.getOr('')('name')(fp.find(channel =>
                      channel.id === row.fundChannelId)(
                      fundChannels)),
                    operator: extractUsername(row),
                  }))(result.rows)
                  res.send(
                    pagingInfo ? {
                      paging: {
                        count: result.count,
                        index: pagingInfo.index,
                        size: pagingInfo.size,
                      },
                      data,
                    } : data,
                  )
                },
              )
            },
          )
        },
        err => {
          log.error(err, req.params)
          res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC))
        },
      )
    }
    case 'prepaid': {
      //
      const dateWhere = dateFilter(startDate, endDate)

      const flowOptions = fp.assign(
        {
          where: fp.assign(
            {
              projectId: projectId,
              contractId: contractId,
            },
            dateWhere ? {paymentDay: dateWhere} : {},
          )
          , order: [['paymentDay', 'DESC']]
          , attributes: ['id'],
        },
        pagingInfo ? {offset: pagingInfo.skip, limit: pagingInfo.size} : {},
      )

      return MySQL.PrePaidFlows.findAndCountAll(flowOptions).then(
        result => {
          const count = result.count

          const flowId = fp.map('id')(result.rows || result)

          const options = {
            where: {
              flowId: {$in: flowId},
            },
            order: [['paymentDay', 'DESC']],
            include: [
              {
                model: MySQL.Settings,
                attributes: ['key'],
              }, {
                model: MySQL.PrePaidFlows,
                attributes: ['amount', 'balance'],
              }],
          }

          const deviceOptions = fp.assign(
            options
            , group ? {
              group: ['type']
              , attributes: [
                [
                  MySQL.Sequelize.fn('sum', MySQL.Sequelize.col('amount')),
                  'amount']
                ,
                'type',
              ],
            } : {},
          )
          const dailyOptions = fp.assign(
            options
            , group ? {
              group: ['configId']
              , attributes: [
                [
                  MySQL.Sequelize.fn('sum', MySQL.Sequelize.col('amount')),
                  'amount']
                ,
                'configId',
              ],
            } : {},
          )
          return Promise.all([
            MySQL.DevicePrePaid.findAll(deviceOptions),
            MySQL.DailyPrePaid.findAll(dailyOptions),
          ]).then(
            ([devices, prepaid]) => {
              const prepaidBillWithType = fp.map(translate)(prepaid)
              const deviceBillWithType = fp.map(translate)(devices)
              const data = fp.orderBy(['paymentDay', 'balance']
                , ['desc', 'asc'],
              )(fp.union(deviceBillWithType, prepaidBillWithType))

              res.send(
                pagingInfo ? {
                  paging: {
                    count: count,
                    index: pagingInfo.index,
                    size: pagingInfo.size,
                  },
                  data,
                } : data,
              )
            },
          )
        },
        err => {
          log.error(err)
        },
      )
    }
    }
  },
}

const translate = fp.pipe(j => j.toJSON(),
  fp.defaults({type: 'DAILYPREPAID'}),
  single => fp.defaults(
    {configName: single.setting.key})(
    single),
  single => fp.defaults(
    {
      balance: fp.getOr(0)('prePaidFlow.balance')(single),
      amount: fp.getOr(0)('prePaidFlow.amount')(single),
    })(single),
  fp.omit(['setting', 'prePaidFlow']))

const extractUsername = row => {
  const pureAuth = fp.get('operatorInfo.username')(row)
  return pureAuth ? pureAuth : fp.get('user.auth.username')(row)
}