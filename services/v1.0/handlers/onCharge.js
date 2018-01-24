'use strict';

const _ = require('lodash');
const fp = require('lodash/fp');
const common = Include("/services/v1.0/common");

/**
 * Operations on pingPP callback
 */
module.exports = {
	post: (req, res) => {

		(async()=>{
            const body = req.body;
            log.info(body);

            //
            const data = body.data.object;

            const metaData = data.metadata;

            if(!Util.ParameterCheck(metaData,
                    ['fundChannelId', 'billIds', 'userId', 'orderNo', 'projectId', 'contractId']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            const fundChannelId = metaData.fundChannelId;
            const projectId = metaData.projectId;
            const contractId = metaData.contractId;
            const billIds = metaData.billIds;
            const userId = metaData.userId;
            const orderNo = metaData.orderNo;


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

                if (contract.bills.length !== billIds.length) {
                    return res.send(404, ErrorCode.ack(ErrorCode.BILLNOTEXISTS))
                }


                //check payment
				const countOfBillPaid = _.sum(fp.map(bill=>{
					return _.sum(fp.map(payment=>{
						return payment.orderNo === orderNo ? 1 : 0
					})(bill.payments));
				})(contract.bills));

                if(countOfBillPaid > 0){
                	log.warn('pingpp callback id:', body.id, ' has been paid', 'orderNo', orderNo);
                	return res.send();
				}

				//do charge
                await common.PayBills(contract.bills, projectId, fundChannelId, userId, orderNo);

                res.send();
            }
            catch(e){
            	log.error(e);
			}
		})();

	}
};
