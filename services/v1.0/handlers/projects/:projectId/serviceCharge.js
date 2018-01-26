'use strict';

const fp = require('lodash/fp');

module.exports = {
	get: (req, res) => {
		(async()=>{

			const projectId = req.params.projectId;

			try {
                const serviceCharge = await MySQL.ServiceCharge.findAll({
                    where: {
                        projectId: projectId
                    }
                });

				res.send(serviceCharge);
            }
            catch(e){
				log.error(e, projectId);
				res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
			}

		})();
	},
	patch: (req, res)=>{
        (async()=>{

            const projectId = req.params.projectId;
            const body = req.body;

            if(!Util.ParameterCheck(body,
                    ['fundChannelId', 'type', 'strategy']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            const checkTopup = ()=>{
            	if(body.type !== Typedef.ServiceChargeType.TOPUP){
            		return true;
				}

                const strategy = body.strategy;
                if(!Util.ParameterCheck(strategy,
                        ['user', 'project', 'fee']
                    )){
                    return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, {message: 'parameter user or project is required'}));
                }

                if(!strategy.fee){
                    return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
                }

                if(strategy.user + strategy.project !== 100){
                    return res.send(403, ErrorCode.ack(ErrorCode.PARAMETERERROR, 'the sum percent of user + project should be equals 100%'));
                }
			};

            checkTopup();

            try {
            	const isExists = await MySQL.FundChannels.count({
					where:{
						id: body.fundChannelId
					}
				});
            	if(!isExists){
            		return res.send(404, ErrorCode.ack(ErrorCode.CHANNELNOTEXISTS));
				}

            	const result = await MySQL.ServiceCharge.findOrCreate({
                    where:{
                        projectId: projectId,
                        fundChannelId: body.fundChannelId,
                        type: body.type,
                    },
                    defaults:{
                        projectId: projectId,
                        fundChannelId: body.fundChannelId,
                        type: body.type,
                        strategy: body.strategy
                    }
                });
            	if(!result[1]){
            	    await MySQL.ServiceCharge.update(
                        {
                            strategy: body.strategy
                        },
                        {
                            where:{
                                id: result[0].id
                            }
                        }
                    );
                }

                res.send(201);
            }
            catch(e){
                log.error(e, projectId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }

        })();
	}
};