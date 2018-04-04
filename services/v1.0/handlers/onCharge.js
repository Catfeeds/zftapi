'use strict';

const common = Include('/services/v1.0/common');

/**
 * Operations on pingPP callback
 */
module.exports = {
    post: (req, res) => {

        (async()=>{
            const body = req.body;
            log.info('onCharge: ', body);

            //
            const data = body.data.object;

            const metaData = data.metadata;

            if(!Util.ParameterCheck(metaData,
                ['fundChannelId', 'userId', 'orderNo', 'projectId']
            )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            const fundChannelId = metaData.fundChannelId;
            const projectId = metaData.projectId;
            const contractId = metaData.contractId;
            const billIds = metaData.billIds;
            const userId = metaData.userId;
            const orderNo = metaData.orderNo;
            const amount = data.amount;

            try {
                const fundChannel = await MySQL.ReceiveChannels.findOne({
                    where: {
                        fundChannelId: fundChannelId
                    },
                    include: [
                        {
                            model: MySQL.FundChannels,
                            as: 'fundChannel',
                            where: {
                                status: Typedef.FundChannelStatus.PASSED,
                                projectId: projectId
                            }
                        }
                    ]
                });
                if (!fundChannel) {
                    return res.send(404, ErrorCode.ack(ErrorCode.CHANNELNOTEXISTS));
                }

                //
                if(!billIds){
                    //
                    const topUpCount = await MySQL.Topup.count({
                        where:{
                            orderNo: orderNo,
                        }
                    });
                    if(topUpCount>0){
                        return res.send();
                    }

                    const result = await common.topUp(fundChannel, projectId, userId, userId, contractId, amount);
                    if(result.code !== ErrorCode.OK){
                        res.send(500);
                    }
                    else {
                        res.send();
                    }
                }
                else{
                    //
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
                                },
                                include: [
                                    {
                                        model: MySQL.BillPayment,
                                        as: 'payments',
                                    }
                                ]
                            }
                        ]
                    });
                    if (!contract) {
                        return res.send(404, ErrorCode.ack(ErrorCode.CONTRACTNOTEXISTS));
                    }

                    const billsOrderNoCount = await MySQL.BillPayment.count({
                        where:{
                            orderNo: orderNo
                        }
                    });
                    if(billsOrderNoCount>0){
                        return res.send();
                    }


                    await common.payBills(MySQL)(contract.bills, projectId, fundChannelId, userId, orderNo);
                    res.send();
                }
            }
            catch(e){
                log.error(e);
            }
        })();

    }
};
