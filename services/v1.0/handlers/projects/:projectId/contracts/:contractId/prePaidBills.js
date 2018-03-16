'use strict';
/**
 * Operations on /contracts/{contractid}/bills
 */
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

        const checkDate = (date)=>{
            if(date){
                const momentObj = moment.unix(date);
                if(!momentObj.isValid()){
                    return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {parameter: date}));
                }
            }
        };

        checkDate(query.startDate);
        checkDate(query.endDate);

        const dateFilter = ()=>{
            return fp.assignAll([
                query.startDate ? {createdAt:{$gte: moment.unix(query.startDate).toDate()}} : {}
                , query.endDate ? {createdAt:{$lte: moment.unix(query.endDate).toDate()}} : {}
            ]);
        };

        const mode = query.mode;
        const pagingInfo = Util.PagingInfo(query.index, query.size, true);
        //
        switch(mode){
        case 'topup':
            {
                const where = fp.assign(
                    {
                        projectId: projectId,
                        contractId: contractId
                    },
                    dateFilter()
                );
                MySQL.Topup.findAndCountAll({
                    where: where,
                    attributes:['fundChannelId', 'createdAt', 'amount'],
                    offset: pagingInfo.skip,
                    limit: pagingInfo.size,
                    order:[['createdAt', 'DESC']]
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
                                        const channel = fp.find(channel =>
                                            channel.id === row.fundChannelId)(
                                            fundChannels);

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
