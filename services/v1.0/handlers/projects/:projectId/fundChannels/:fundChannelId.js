'use strict';
const fp = require('lodash/fp');
const common = Include("/services/v1.0/common");
const _ = require('lodash');
const moment = require('moment');
/**
 * Operations on /fundChannels/{fundChannelId}
 */


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

        if(!Util.ParameterCheck(req.body,
                ['contractId', 'amount', 'userId']
            )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        const contractId = req.body.contractId;
        const amount = req.body.amount;
        const userId = req.body.userId;

        //todo: check if contract is available

        MySQL.FundChannels.count({
            where:{
                id: fundChannelId
            }
        }).then(
            isExists=>{
                if(!isExists){
                    return res.send(404, ErrorCode.ack(ErrorCode.CHANNELNOTEXISTS))
                }

                const Save = (resetLock, retry)=>{
                    if(retry >= 20){
                        return res.send(ErrorCode.ack(ErrorCode.RETRYLATER));
                    }
                    MySQL.CashAccount.findOne({
                        where:{
                            userId: userId
                        }
                    }).then(
                        cashAccount=>{
                            if(!cashAccount){
                                return res.send(404, ErrorCode.ack(ErrorCode.USERNOTEXISTS));
                            }

                            //topup
                            MySQL.Sequelize.transaction(t=>{
                                return MySQL.CashAccount.update(
                                    {
                                        cash: MySQL.Literal(`cash+${amount}`),
                                        locker: resetLock ? 0 : MySQL.Literal(`locker+1`)
                                    },
                                    {
                                        where:{
                                            locker: cashAccount.locker
                                        },
                                        transaction: t
                                    }
                                ).then(
                                    result=>{
                                        if(!result || !result[0]){
                                            //save failed
                                            throw new Error(ErrorCode.LOCKDUMPLICATE);
                                        }

                                        return MySQL.Topup.create({
                                            orderNo: SnowFlake.next(),
                                            userId: userId,
                                            contractId: contractId,
                                            projectId: projectId,
                                            amount: amount,
                                            fundChannelId: fundChannelId,
                                            operator: req.user.id
                                        }, {transaction: t});
                                    }
                                );
                            }).then(
                                result=>{
                                    res.send(200);
                                }
                            ).catch(
                                err=>{
                                    log.error(err);

                                    if(err.original.errno === 1264){
                                        return setImmediate(()=>{
                                            Save(true, retry+1);
                                        });
                                    }
                                    else if(err.message === ErrorCode.LOCKDUMPLICATE){
                                        return setImmediate(()=>{
                                            Save(false, retry+1);
                                        });
                                    }
                                    else {
                                        res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
                                    }
                                }
                            );
                        }
                    );
                };

                Save();
            }
        );
    }
};
