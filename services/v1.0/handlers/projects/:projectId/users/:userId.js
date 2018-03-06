'use strict';

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
        const projectId = req.params.projectId;
        const userId = req.params.userId;

        MySQL.Users.findOne({
            where:{
                id: userId
            },
            include:[
                {
                    model: MySQL.CashAccount,
                    as: 'cashAccount'
                    ,attributes:['balance']
                }
            ]
        }).then(
            user=>{
                res.send(user);
            },
            err=>{
                log.error(err, projectId, userId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        );
    },
};
