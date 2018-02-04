'use strict';
const _ = require('lodash');
const fp = require('lodash/fp');

const common = Include('/services/v1.0/common');
const assignNewId = common.assignNewId;
/**
 * Operations on /fundChannels/{fundChannelId}
 */

async function Pay(serviceCharge, projectId, fundChannel, contractId, bills, userId) {
    const orderNo = assignNewId().id;
    if(fundChannel.setting && fundChannel.setting.appid && fundChannel.setting.key){
        //online

        const metadata = {
            fundChannelId: fundChannel.id,
            orderNo: orderNo,
            projectId: projectId,
            contractId: contractId,
            userId: userId,
            billIds: fp.map(bill=>{
                return bill.id;
            })(bills)
        };

        try {
            const result = await Util.charge(fundChannel, serviceCharge.amountForBill, orderNo, 'subject', 'body', metadata);
            return result;
        }
        catch(e){
            log.error(e, serviceCharge, projectId, fundChannel, contractId, bills, userId);
        }
    }
    else{
        //
        const result = await common.payBills(bills, projectId, fundChannel, userId, orderNo);
        return result;
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
    patch: (req, res)=>{
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        const projectId = req.params.projectId;
        const contractId = req.params.contractId;
        const userId = req.params.userId;

        const body = req.body;
        const billIds = body.billIds;
        const fundChannelId = body.fundChannelId;

        if(!Util.ParameterCheck(body,
                ['contractId', 'billIds', 'userId']
            )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }


        (async()=>{
            try {
                const receiveChannelAttributes = ['fee', 'setting', 'share'];
                const fundChannelAttributes = ['category', 'flow', 'name', 'tag', 'id'];
                const result = await MySQL.ReceiveChannels.findOne({
                    where:{
                        fundChannelId: fundChannelId
                    },
                    attributes: receiveChannelAttributes,
                    include:[
                        {
                            model: MySQL.FundChannels,
                            as: 'fundChannel',
                            where:{
                                status: Typedef.FundChannelStatus.PASSED,
                                projectId: projectId
                            },
                            attributes: fundChannelAttributes,
                            include:[
                                {
                                    model: MySQL.ServiceCharge,
                                    as: 'serviceCharge'
                                }
                            ]
                        }
                    ]
                });

                if(!result){
                    return res.send(404, ErrorCode.ack(ErrorCode.CHANNELNOTEXISTS));
                }

                const fundChannel = _.omit( _.assign(result.toJSON(), _.pick(result.fundChannel, _.concat(fundChannelAttributes, 'serviceCharge'))), 'fundChannel' );
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
                    return res.send(404, ErrorCode.ack(ErrorCode.BILLNOTEXISTS));
                }

                const amount = _.sum(fp.map(bill => {
                    return bill.dueAmount;
                })(contract.bills));

                const serviceCharge = common.serviceCharge(fundChannel, amount);

                const payResult = await Pay(serviceCharge, projectId, fundChannel, contractId, contract.bills, userId);
                if( payResult.code === ErrorCode.OK ){
                    res.send();
                }
                else{
                    res.send(500, payResult);
                }
            }
            catch(e){
                log.error(e, body);
            }
        })();
    }
};
