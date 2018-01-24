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
	post: (req, res)=>{
        (async()=>{

            const projectId = req.params.projectId;
            const body = req.body;

            if(!Util.ParameterCheck(body,
                    ['userShare', 'projectShare']
                )){
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
            }

            if(body.userShare + body.projectShare !== 100){
            	return res.send(403, ErrorCode.ack(ErrorCode.PARAMETERERROR, 'sum of share should be 100%'));
			}

            try {
            	await MySQL.ServiceCharge.upsert(
					{
                        projectId: projectId,
                        userShare: body.userShare,
                        projectShare: body.projectShare
					},
					{
						projectId: projectId
					});

                res.send(201);
            }
            catch(e){
                log.error(e, projectId);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }

        })();
	}
};