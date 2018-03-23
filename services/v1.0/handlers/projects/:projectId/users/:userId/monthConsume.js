'use strict';
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
    get: (req, res)=>{
        /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
        (async()=>{
            const projectId = req.params.projectId;
            const userId = req.params.userId;

            if(!Util.ParameterCheck(req.query, ['month'])){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, 'please provide month'));
            }

            const month = req.query.month;
            const startDate = moment(month, 'YYYYMM').startOf('days');
            const endDate = moment(month, 'YYYYMM').endOf('days');

            if(!startDate.isValid() || !endDate.isValid() ){
                return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {month: month}));
            }

            //
            const contract = await  MySQL.Contracts.findOne({
                where: {
                    userId: userId
                    , status: Typedef.ContractStatus.ONGOING
                }
                ,attributes: ['id']
            });
            if(!contract){
                return res.send(404, ErrorCode.ack(ErrorCode.CONTRACTNOTEXISTS));
            }

            const options =  {
                where:{
                    contractId: contract.id,
                    paymentDay:{
                        $gte: startDate.unix()
                        , $lte: endDate.unix()
                    }
                }
            };
            Promise.all([
                MySQL.DevicePrePaid.sum('amount', options)
                , MySQL.DailyPrePaid.sum('amount', options)
            ]).then(
                sumResult => {
                    const consume = sumResult[0] || 0 + sumResult[1] || 0;
                    res.send({
                        month: month,
                        consume: Math.abs(consume)
                    });
                }
                , err => {
                    log.error(err, projectId, userId, month);
                    res.send(500, ErrorCode.ack());
                }
            );

        })();
    },
};
