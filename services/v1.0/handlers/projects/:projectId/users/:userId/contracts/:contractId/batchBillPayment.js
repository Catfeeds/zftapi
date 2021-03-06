'use strict'
const fp = require('lodash/fp')

const {assignNewId, moveFundChannelToRoot, payBills, serviceCharge: serviceChargeOf} =
    require('../../../../../../../common')

/**
 * Operations on /fundChannels/{fundChannelId}
 */

async function Pay(
  serviceCharge, projectId, fundChannel, contractId, bills, userId) {
  const orderNo = assignNewId().id
  if (fundChannel.setting && fundChannel.setting.appid &&
        fundChannel.setting.key) {
    //online

    const metadata = {
      fundChannelId: fundChannel.id,
      orderNo: orderNo,
      projectId: projectId,
      contractId: contractId,
      userId: userId,
      billIds: fp.map('id')(bills),
    }

    try {
      return await Util.charge(fundChannel,
        serviceCharge.amountForBill, orderNo, 'subject', 'body',
        metadata)
    }
    catch (e) {
      log.error(e, serviceCharge, projectId, fundChannel, contractId,
        bills, userId)
    }
  }
  else {
    //
    return await payBills(MySQL)(bills, projectId,
      fundChannel, userId, orderNo)
  }
}

module.exports = {
  /**
     * summary: topup
     * description:

     * parameters: hid
     * produces: application/json
     * responses: 200, 400
     */
  patch: (req, res) => {
    /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    const projectId = req.params.projectId
    const contractId = req.params.contractId
    const userId = req.params.userId

    const body = req.body

    if (!Util.ParameterCheck(body,
      ['billIds', 'fundChannelId'],
    )) {
      return res.send(422,
        ErrorCode.ack(ErrorCode.PARAMETERMISSED, 'please provide billIds & fundChannelId.'))
    }

    const billIds = body.billIds
    const fundChannelId = body.fundChannelId;

    (async () => {
      try {
        const receiveChannelAttributes = ['fee', 'setting', 'share']
        const fundChannelAttributes = [
          'category',
          'flow',
          'name',
          'tag',
          'id']
        const result = await MySQL.ReceiveChannels.findOne({
          where: {
            fundChannelId: fundChannelId,
          },
          attributes: receiveChannelAttributes,
          include: [
            {
              model: MySQL.FundChannels,
              as: 'fundChannel',
              where: {
                status: Typedef.FundChannelStatus.PASSED,
                projectId: projectId,
              },
              attributes: fundChannelAttributes,
              include: [
                {
                  model: MySQL.ServiceCharge,
                  as: 'serviceCharge',
                },
              ],
            },
          ],
        })

        if (!result) {
          return res.send(404,
            ErrorCode.ack(ErrorCode.CHANNELNOTEXISTS))
        }

        const fundChannel = moveFundChannelToRoot(result)(
          fundChannelAttributes)
        const contract = await MySQL.Contracts.findOne({
          where: {
            id: contractId,
            projectId: projectId,
          },
          include: [
            {
              model: MySQL.Bills,
              as: 'bills',
              where: {
                id: {$in: billIds},
              },
            },
          ],
        })
        if (!contract) {
          return res.send(404,
            ErrorCode.ack(ErrorCode.CONTRACTNOTEXISTS))
        }

        if (contract.bills.length !== billIds.length) {
          return res.send(404,
            ErrorCode.ack(ErrorCode.BILLNOTEXISTS))
        }

        const amount = fp.sum(fp.map('dueAmount')(contract.bills))

        const serviceCharge = serviceChargeOf(fundChannel, amount)

        const payResult = await Pay(serviceCharge, projectId,
          fundChannel, contractId, contract.bills, userId)
        if (payResult.code === ErrorCode.OK) {
          res.send({
            pingpp: payResult.result
          })
        }
        else {
          res.send(500, payResult)
        }
      }
      catch (e) {
        log.error(e, body)
      }
    })()
  },
}
