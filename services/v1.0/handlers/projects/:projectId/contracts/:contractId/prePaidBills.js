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

        const group = query.group;

        const dateFilter = (startDate, endDate)=>{
            if(!startDate && !endDate){
                return null;
            }
            return fp.assignAll([
                startDate ? {$gte: startDate} : {}
                , endDate ? {$lte: endDate} : {}
            ]);
        };

        const defaultPaging = !(startDate && endDate);
        const mode = query.mode;
        const pagingInfo = Util.PagingInfo(query.index, query.size, defaultPaging);
        //
        switch(mode){
        case 'topup':
            {
                MySQL.Contracts.findOne({
                    where:{
                        id: contractId,
                        status: Typedef.ContractStatus.ONGOING
                    }
                }).then(
                    contract=>{
                        if(!contract){
                            return ErrorCode.ack(404, ErrorCode.CONTRACTNOTEXISTS);
                        }

                        const where = fp.extendAll([
                            {
                                projectId: projectId,
                                userId: contract.userId
                            }
                            , dateFilter(startDate, endDate) ? {paymentDay: dateFilter(startDate, endDate)}:{}
                        ]);
                        const options = fp.assign(
                            {
                                where: where,
                                attributes:['fundChannelId', 'createdAt', 'amount'],
                                order:[['createdAt', 'DESC']]
                            },
                            pagingInfo ? {offset: pagingInfo.skip, limit: pagingInfo.size}:{}
                        );

                        const model = pagingInfo ? MySQL.Topup.findAndCountAll(options) : MySQL.Topup.findAll(options);

                        model.then(
                            result=>{
                                const fundChannelId = fp.map(row=>{return row.fundChannelId;})(result.rows);

                                MySQL.FundChannels.findAll({
                                    where:{
                                        id:{$in: fundChannelId}
                                    },
                                    attributes:['id', 'name']
                                }).then(
                                    fundChannels=>{
                                        const data = fp.map(row=>{
                                            const channel = fp.find(channel =>
                                                channel.id === row.fundChannelId)(
                                                fundChannels);

                                            return {
                                                time: moment(row.createdAt).unix(),
                                                amount: row.amount,
                                                fundChannelName: channel ? channel.name : ''
                                            };
                                        })(result.rows);
                                        res.send(
                                            pagingInfo ? {
                                                paging: {
                                                    count: result.count,
                                                    index: pagingInfo.index,
                                                    size: pagingInfo.size
                                                },
                                                data:data
                                            }:data
                                        );
                                    }
                                );
                            }
                        );
                    },
                    err=>{
                        log.error(err, req.params);
                        res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
                    }
                );
            }
            break;
        case 'prepaid':
            {
                //
                const dateWhere = dateFilter(startDate, endDate);

                const flowOptions = fp.assign(
                    {
                        where:fp.assign(
                            {
                                projectId: projectId,
                                contractId: contractId
                            },
                            dateWhere ? {paymentDay: dateWhere}:{}
                        )
                        , order: [['paymentDay', 'DESC']]
                        , attributes: ['id']
                    },
                    pagingInfo ? {offset: pagingInfo.skip,limit: pagingInfo.size}:{}
                );

                const model = pagingInfo ? MySQL.PrePaidFlows.findAndCountAll(flowOptions) : MySQL.PrePaidFlows.findAll(flowOptions);
                model.then(
                    result=>{
                        const count = result.count;

                        const flowId = fp.map(row=>{return row.id;})(result.rows || result);

                        const options = {
                            where:{
                                flowId:{$in: flowId}
                            },
                            order: [['paymentDay', 'DESC']],
                        };

                        const deviceOptions = fp.assign(
                            options
                            , group? {
                                group: ['type']
                                , attributes: [
                                    [MySQL.Sequelize.fn('sum', MySQL.Sequelize.col('amount')), 'amount']
                                    , 'type'
                                ]
                            } : {}
                        );
                        const dailyOptions = fp.assign(
                            options
                            , group? {
                                group: ['configId']
                                , attributes: [
                                    [MySQL.Sequelize.fn('sum', MySQL.Sequelize.col('amount')), 'amount']
                                    , 'configId'
                                ]
                            } : {}
                        );
                        Promise.all([
                            MySQL.DevicePrePaid.findAll(deviceOptions),
                            MySQL.DailyPrePaid.findAll(dailyOptions)
                        ]).then(
                            prePaidResult=>{
                                const data = fp.orderBy(['paymentDay']
                                    , ['desc']
                                )(fp.union(prePaidResult[0], prePaidResult[1]));

                                res.send(
                                    pagingInfo ? {
                                        paging: {
                                            count: count,
                                            index: pagingInfo.index,
                                            size: pagingInfo.size
                                        },
                                        data:data
                                    }:data
                                );
                            }
                        );
                    },
                    err=>{
                        log.error(err);
                    }
                );


                // const where = fp.assign(
                //     {
                //         projectId: projectId,
                //         contractId: contractId
                //     },
                //     dateFilter() ? {paymentDay: dateFilter()}:{}
                // );
                // MySQL.DevicePrePaid.findAndCountAll({
                //     where:where,
                //     offset: pagingInfo.skip,
                //     limit: pagingInfo.size
                // }).then(
                //     result=>{
                //         res.send({
                //             paging: {
                //                 count: result.count,
                //                 index: pagingInfo.index,
                //                 size: pagingInfo.size
                //             },
                //             data: result.rows
                //         });
                //     }
                // );
            }
            break;
        }
    }
};
