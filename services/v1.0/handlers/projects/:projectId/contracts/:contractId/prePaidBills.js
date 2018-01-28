'use strict';
/**
 * Operations on /contracts/{contractid}/bills
 */
const _ = require('lodash');
const fp = require('lodash/fp');
const moment = require('moment');


module.exports = {
    get: (req, res)=>{
        const projectId = req.params.projectId;
        const contractId = req.params.contractId;
        const query = req.query;

        if(!Util.ParameterCheck(query,
            ['mode']
        )){
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        const mode = query.mode;
        const pagingInfo = Util.PagingInfo(query.index, query.size, true);
        //
        switch(mode){
        case 'topup':
            {
                MySQL.Topup.findAndCountAll({
                    where:{
                        projectId: projectId,
                        contractId: contractId
                    },
                    attributes:['fundChannelId', 'createdAt', 'amount'],
                    offset: pagingInfo.skip,
                    limit: pagingInfo.size
                }).then(
                    result=>{
                        const fundChannelId = fp.map(row=>{return row.fundChannelId;})(result.rows);

                        MySQL.FundChannels.findAll({
                            where:{
                                id:{$in: fundChannelId}
                            },
                            attributes:['id', 'name']
                        }).then(
                            fundChannels=>{
                                res.send({
                                    paging: {
                                        count: result.count,
                                        index: pagingInfo.index,
                                        size: pagingInfo.size
                                    },
                                    data: fp.map(row=>{
                                    	const channel = _.find(fundChannels, channel=>{
                                    		return channel.id === row.fundChannelId;
                                        });

                                        return {
                                            time: moment(row.createdAt).unix(),
                                            amount: row.amount,
                                            fundChannelName: channel ? channel.name : ''
                                        };
                                    })(result.rows)
                                });
                            }
                        );
                    }
                );
            }
            break;
        case 'prepaid':
            {
                MySQL.DevicePrePaid.findAndCountAll({
                    where:{
                        projectId: projectId,
                        contractId: contractId
                    },
                    offset: pagingInfo.skip,
                    limit: pagingInfo.size
                }).then(
                    result=>{
                        res.send({
                            paging: {
                                count: result.count,
                                index: pagingInfo.index,
                                size: pagingInfo.size
                            },
                            data: result.rows
                        });
                    }
                );
            }
            break;
        }
    }
};
