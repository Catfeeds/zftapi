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

        const startDate = parseInt(query.startDate);
        const endDate = parseInt(query.endDate);
        checkDate(query.startDate);
        checkDate(query.endDate);

        const dateFilter = ()=>{
            if(!startDate && !endDate){
                return null;
            }
            return fp.assignAll([
                startDate ? {$gte: parseInt(moment.unix(startDate).format('YYYYMMDD'))} : {}
                , endDate ? {$lte: parseInt(moment.unix(endDate).format('YYYYMMDD'))} : {}
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
                    dateFilter() ? {paymentDay: dateFilter()}:{}
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
                const where = fp.assign(
                    {
                        projectId: projectId,
                        contractId: contractId
                    },
                    dateFilter() ? {paymentDay: dateFilter()}:{}
                );
                MySQL.DevicePrePaid.findAndCountAll({
                    where:where,
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
