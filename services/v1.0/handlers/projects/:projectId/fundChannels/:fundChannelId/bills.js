'use strict';
const moment = require('moment');
const _ = require('lodash');
const fp = require('lodash/fp');

const common = Include("/services/v1.0/common");
const assignNewId = common.assignNewId;
/**
 * Operations on /fundChannels/{fundChannelId}
 */

async function pingppExtra(channel, userId) {
    switch (channel.tag){
        case 'wx':
        case 'wx_pub': {
            try {
                const wxUser = await MySQL.WXUser.findOne({
                    where: {
                        userId: userId
                    }
                });

                return {
                    open_id: wxUser.openId
                }
            }
            catch(e){
                log.error(e, channel, userId);
            }

        }
            break;
        default:
            return {};
    }
}

async function Pay(projectId, fundChannel, contractId, bills, userId, amount) {
    if(fundChannel.setting && fundChannel.setting.appid && fundChannel.setting.key){
        //online
        const pingXX = require('pingpp')(fundChannel.setting.key);

        const billIds = fp.map(bill=>{
            return bill.id;
        })(bills);

        const orderNo = assignNewId().id;
        const chargesObj = {
            amount: amount,
            order_no: orderNo,
            channel: fundChannel.tag,
            client_ip: "127.0.0.1",
            subject: "subject",
            body: "body",
            currency: 'cny',
            app: {
                id: fundChannel.setting.appid
            },
            // extra: await pingppExtra(fundChannel.tag, userId),
            metadata: {
                fundChannelId: fundChannel.id,
                orderNo: orderNo,
                projectId: projectId,
                contractId: contractId,
                userId: userId,
                billIds: billIds
            }
        };
        const charge = await pingXX.charges.create(chargesObj);

        return charge;
    }
    else{
        //
        return await common.PayBills(bills, projectId, fundChannel.id, userId);

        // const payBills = fp.map(bill=>{
        //     return {
        //         id: assignNewId().id,
        //         projectId: projectId,
        //         billId: bill.id,
        //         flowId: assignNewId().id,
        //         paymentChannel: fundChannel.id,
        //         amount: bill.dueAmount,
        //         operator: userId,
        //         paidAt: moment().unix(),
        //     };
        // })(bills);
        //
        // const flows = fp.map(bill=>{
        //     return {
        //         id: bill.flowId,
        //         projectId: projectId,
        //         category: 'rent'
        //     };
        // })(payBills);
        //
        // try{
        //     const t = await MySQL.Sequelize.transaction();
        //
        //     await MySQL.BillPayment.bulkCreate(payBills, {transaction: t});
        //     await MySQL.Flows.bulkCreate(flows, {transaction: t});
        //
        //     await t.commit();
        //     return '';
        // }
        // catch(e){
        //     log.error(e, fundChannel.toJSON(),contractId, userId, payBills, flows);
        //     return ErrorCode.ack(ErrorCode.DATABASEEXEC);
        // }
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
    patch: (req, res, next)=>{
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        const projectId = req.params.projectId;
        const fundChannelId = req.params.fundChannelId;

        const body = req.body;

        if(!Util.ParameterCheck(body,
                ['contractId', 'billIds', 'userId']
            )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        const contractId = body.contractId;
        const billIds = body.billIds;
        const userId = body.userId;


        (async()=>{
            try {
                const fundChannel = await MySQL.ReceiveChannels.findOne({
                    where:{
                        fundChannelId: fundChannelId
                    },
                    include:[
                        {
                            model: MySQL.FundChannels,
                            as: 'fundChannel',
                            where:{
                                status: Typedef.FundChannelStatus.PASSED,
                                projectId: projectId
                            }
                        }
                    ]
                });
                if (!fundChannel) {
                    return res.send(404, ErrorCode.ack(ErrorCode.CHANNELNOTEXISTS));
                }

                const contract = await MySQL.Contracts.findOne({
                    where: {
                        id: contractId,
                        projectId: projectId
                    },
                    include: [
                        {
                            model: MySQL.Bills,
                            as: 'bills',
                            where: {
                                id: {$in: billIds}
                            }
                        }
                    ]
                });
                if (!contract) {
                    return res.send(404, ErrorCode.ack(ErrorCode.CONTRACTNOTEXISTS));
                }

                if (contract.bills.length !== billIds.length) {
                    return res.send(404, ErrorCode.ack(ErrorCode.BILLNOTEXISTS))
                }

                const amount = _.sum(fp.map(bill => {
                    return bill.dueAmount;
                })(contract.bills));

                const result = await Pay(projectId, fundChannel, contractId, contract.bills, userId, amount);
                res.send(result);
            }
            catch(e){
                log.error(e, body);
            }
        })();
    }
};
