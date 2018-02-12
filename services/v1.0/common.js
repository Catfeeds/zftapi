'use strict';

const _ = require('lodash');
const fp = require('lodash/fp');
const moment = require('moment');
const bigDecimal = require('bigdecimal');

exports.UpsertGeoLocation = (location, t)=>{
    if(!location.id) {
        location = exports.assignNewId(location);
    }
    return MySQL.GeoLocation.findOrCreate({
        where:{
            code: location.code
        },
        transaction: t,
        defaults: location
    });
};

exports.AsyncUpsertGeoLocation = async (location, t) => {
    if(!location.id) {
        location = exports.assignNewId(location);
    }
    return await MySQL.GeoLocation.findOrCreate({
        where:{
            code: location.code
        },
        transaction: t,
        defaults: location
    });
};

exports.QueryEntire = (projectId, query, include, attributes)=>{
    return new Promise((resolve, reject)=>{
        const where = _.assignIn({},
            query.buildingId ? {'$building.id$': query.buildingId} : {},
            query.houseFormat ? {houseFormat: query.houseFormat} : {},
            query.houseStatus ? { 'status': query.houseStatus } : {},
            query.roomStatus ? {'$rooms.status$': query.roomStatus }: {},
            query.layoutId ? {'layoutId': query.layoutId}: {},
            query.floor ? {'currentFloor': query.floor}: {},
            query.q ? {$or: [
                {roomNumber: {$regexp: query.q}},
                {code: {$regexp: query.q}},
            ]} : {},
            query.bedRoom ? {'$layouts.bedRoom$': query.bedRoom} : {}
        );

        const queryInclude = _.union(
            [
                {
                    model: MySQL.Building, as: 'building'
                    , include:[{
                        model: MySQL.GeoLocation, as: 'location'
                    }]
                },
                {model: MySQL.Layouts, as: 'layouts'},
                {
                    model: MySQL.Rooms,
                    as: 'rooms',
                    include:[
                        {
                            model: MySQL.HouseDevices,
                            as: 'devices'
                        }
                    ]
                }
            ],
            include ? include : []
        );


        const pagingInfo = Util.PagingInfo(query.index, query.size, true);

        Promise.all([
            MySQL.Houses.count(
                _.assignIn({
                    where: where,
                }, attributes ? attributes:{})
            ),
            MySQL.Houses.findAll(
                _.assignIn({
                    where: where,
                    subQuery: false,
                    include: queryInclude,
                    offset: pagingInfo.skip,
                    limit: pagingInfo.size
                }, attributes ? attributes:{})
            )
        ]).then(
            result=>{
                const count = result[0];

                resolve({
                    count: count,
                    data: result[1]
                });
            },
            err=>{
                log.error(err, projectId, query, include, attributes);
                reject(ErrorCode.DATABASEEXEC);
            }
        );
    });
};


exports.omitSingleNulls = fp.omitBy(fp.isNull);
exports.innerValues = fp.getOr({})('dataValues');
exports.omitNulls = fp.map(item => fp.omitBy(fp.isNull)(exports.innerValues(item)));
exports.assignFieldId = field => item => fp.defaults({[field]: SnowFlake.next()})(item);
exports.assignNewId = item => exports.assignFieldId('id')(item);

exports.scaleUp = (v) => {
    return v * 10000;
};
exports.scaleDown = (v) => {
    return v / 10000;
};

exports.singleRoomTranslate = model => {
    const room = model.dataValues;
    const status = room.status;
    const house = room.house.dataValues;
    const building = house.building.dataValues;
    const location = building.location.dataValues;
    return {
        id: room.id,
        houseId: house.id,
        locationName: location.name,
        group: building.group,
        building: building.building,
        unit: building.unit,
        roomNumber: house.roomNumber,
        roomName: room.name,
        status
    };
};

exports.roomLeasingStatus = (contracts, suspension = []) => {
    const now = moment().unix();
    const lastSuspension = fp.compact([fp.max(suspension, 'from')]);
    // PAUSE
    if (fp.some(suspendingRoom => (now > suspendingRoom.from && fp.isNull(suspendingRoom.to)))(lastSuspension)) {
        return Typedef.OperationStatus.PAUSED;
    }

    const simplified = fp.map(fp.pick(['from', 'to', 'id']))(contracts);
    const compactedContracts = fp.filter(c => !fp.isUndefined(c.from))(fp.concat(simplified, lastSuspension));
    return fp.some(contract => (now > contract.from && contract.to > now))(compactedContracts) ?
        Typedef.OperationStatus.INUSE : Typedef.OperationStatus.IDLE;
};

exports.jsonProcess = (model) => fp.defaults(model)({
    expenses: model.expenses ? JSON.parse(model.expenses) : undefined,
    strategy: model.strategy ? JSON.parse(model.strategy) : undefined
});

exports.userConnection = (sequelizeModel) => ({
    model: sequelizeModel.Users
});
exports.includeContracts = (sequelizeModel) =>
    (houseFormat, contractCondition) => fp.defaults({
        include: [exports.userConnection(sequelizeModel), exports.houseConnection(sequelizeModel)(houseFormat)],
        model: sequelizeModel.Contracts
    })(fp.isUndefined(contractCondition) ? {
        where: {
            status: Typedef.ContractStatus.ONGOING
        }
    } : contractCondition);

exports.houseConnection = (sequelizeModel) => (houseFormat) => {
    const houseInclude = fp.defaults({
        model: sequelizeModel.Houses,
        as: 'house',
        attributes: ['id', 'roomNumber', 'buildingId'],
        include: [{
            model: sequelizeModel.Building, as: 'building',
            attributes: ['building', 'unit'],
            include: [{
                model: sequelizeModel.GeoLocation,
                as: 'location',
                attributes: ['name']
            }]
        }]
    })(fp.isEmpty(houseFormat) ? {} : {where: {houseFormat}});
    return {
        model: sequelizeModel.Rooms,
        attributes: ['id', 'name', 'houseId'],
        required: true,
        include: [houseInclude]
    };
};

exports.deviceStatus = (device)=>{
    const runStatus = ()=>{
        if(!device || !device.freq || !device.updatedAt){
            return  Typedef.DriverCommand.EMC_OFFLINE;
        }
        const updatedAt = moment(device.updatedAt).unix();
        const now = moment().unix();
        if( updatedAt + device.freq < now ){
            return Typedef.DriverCommand.EMC_OFFLINE;
        }
        else{
            return Typedef.DriverCommand.EMC_ONLINE;
        }
    };

    return _.assign(device.status || {}, {service: runStatus()});
};

exports.payBills = (sequelizeModel) => async (bills, projectId, fundChannel, userId, orderNo, category) => {
    if(fp.isEmpty(bills)) {
        return ErrorCode.ack(ErrorCode.OK, {message: 'No bills were paid.'});
    }
    const payBills = fp.map(bill=>({
        id: exports.assignNewId().id,
        projectId,
        billId: bill.id,
        orderNo: orderNo ? orderNo : exports.assignNewId().id,
        flowId: exports.assignNewId().id,
        fundChannelId: fundChannel.id,
        amount: bill.dueAmount,
        operator: userId,
        paidAt: moment().unix(),
        serviceCharge: exports.serviceCharge(fundChannel, bill.dueAmount)
    }))(bills);

    const flows = fp.map(bill=>({
        id: bill.flowId,
        projectId,
        category: category ? category : 'rent',
        amount: bill.amount,
        fee: bill.serviceCharge.shareAmount,
    }))(payBills);

    let t;
    try{
        t = await sequelizeModel.Sequelize.transaction({autocommit: false});

        await sequelizeModel.BillPayment.bulkCreate(payBills, {transaction: t});
        await sequelizeModel.Flows.bulkCreate(flows, {transaction: t});

        const billLogFlows = fp.map(bill => exports.logFlows(sequelizeModel)(bill.serviceCharge,
            bill.orderNo, projectId, bill.operator, bill.billId,
            fundChannel, t, Typedef.FundChannelFlowCategory.BILL))(payBills);
        await Promise.all(billLogFlows);

        await t.commit();
        return ErrorCode.ack(ErrorCode.OK);
    }
    catch(e){
        await t.rollback();
        log.error(e, bills, projectId, fundChannel, userId, orderNo, payBills, flows);
        return ErrorCode.ack(ErrorCode.DATABASEEXEC);
    }
};

exports.serviceCharge = (fundChannel, amount)=>{
    //
    console.log(fundChannel);
    let chargeObj = {
        amount,
        amountForBill: amount,
        shareAmount: 0
    };

    _.each(fundChannel.serviceCharge, serviceCharge=>{
        switch(serviceCharge.type){
        case Typedef.ServiceChargeType.TOPUP:
        case Typedef.ServiceChargeType.BILL:
            {
                const CalcShare = (fee, percent)=>{
                    if(fee && percent){
                        if(amount === 1){
                            return 0;
                        }

                        const balance = (
                            new bigDecimal.BigDecimal(amount.toString())
                        ).multiply(
                            new bigDecimal.BigDecimal(fee.toString())
                        ).divide(
                            new bigDecimal.BigDecimal('1000')
                        ).multiply(
                            new bigDecimal.BigDecimal(percent.toString())
                        ).divide(
                            new bigDecimal.BigDecimal('100')
                        ).intValue();

                        //calculate the share percent
                        return balance;
                    }
                    return 0;
                };

                if(!serviceCharge.strategy){
                    return;
                }

                const user = CalcShare(serviceCharge.strategy.fee, serviceCharge.strategy.user);
                const project = CalcShare(serviceCharge.strategy.fee, serviceCharge.strategy.project);
                chargeObj.share = {
                    user: user,
                    project: project
                };
                chargeObj.shareAmount = user + project;

                chargeObj.amountForBill = chargeObj.amount + chargeObj.share.user;

            }
            break;
        }
    });

    if(fundChannel.fee){
        chargeObj.fee = (
            new bigDecimal.BigDecimal(amount.toString())
        ).multiply(
            new bigDecimal.BigDecimal(fundChannel.fee.toString())
        ).divide(
            new bigDecimal.BigDecimal('1000')
        ).intValue();
    }

    return chargeObj;
};

exports.baseFlow = (category, orderNo, projectId,
    billId, fundChannel, amount) =>
    exports.assignNewId({
        fundChannelId: fundChannel.id,
        category,
        orderNo,
        projectId,
        billId,
        amount,
    });

exports.shareFlows = (serviceCharge, orderNo, projectId, userId, billId, fundChannel)=>{

    const category = Typedef.FundChannelFlowCategory.SCTOPUP;
    return _.compact([
        fp.get('share.user')(serviceCharge) ?
            _.assign(
                exports.baseFlow(category, orderNo, projectId, billId, fundChannel, fp.get('share.user')(serviceCharge))
                , {
                    from: userId,
                    to: Typedef.PlatformId,
                }
            ) : null
        , fp.get('share.project')(serviceCharge)  ?
            _.assign(
                exports.baseFlow(category, orderNo, projectId, billId, fundChannel, fp.get('share.user')(serviceCharge))
                , {
                    from: projectId,
                    to: Typedef.PlatformId,
                }
            ) : null
    ]);
};
exports.platformFlows = (serviceCharge, orderNo, projectId, userId, billId, fundChannel)=>{
    const category = Typedef.FundChannelFlowCategory.COMMISSION;
    return _.compact([
        fundChannel.fee ?
            _.assign(
                exports.baseFlow(category, orderNo, projectId, billId, fundChannel, serviceCharge.fee)
                ,{
                    from: Typedef.PlatformId,
                    to: 0,
                }
            ): null
    ]);
};
exports.topupFlows = (amount, orderNo, projectId, userId, billId, fundChannel)=>{
    const category = Typedef.FundChannelFlowCategory.TOPUP;
    return [
        _.assign(
            exports.baseFlow(category, orderNo, projectId, billId, fundChannel, amount)
            ,{
                from: 0,
                to: userId,
            }
        )
    ];
};
exports.billFlows = (amount, orderNo, projectId, userId, billId, fundChannel)=>{
    const category = Typedef.FundChannelFlowCategory.BILL;
    return [
        _.assign(
            exports.baseFlow(category, orderNo, projectId, billId, fundChannel, amount)
            ,{
                from: 0,
                to: userId,
            }
        )
    ];
};

exports.logFlows = (sequelizeModel) => async(serviceCharge, orderNo, projectId, userId, billId, fundChannel, t, category)=>{

    const bulkFlows = _.compact(_.concat([]
        , category === Typedef.FundChannelFlowCategory.BILL ?
            exports.billFlows(serviceCharge.amountForBill, orderNo, projectId, userId, billId, fundChannel)
            : exports.topupFlows(serviceCharge.amount, orderNo, projectId, userId, billId, fundChannel)
        , exports.shareFlows(serviceCharge, orderNo, projectId, userId, billId, fundChannel)
        , exports.platformFlows(serviceCharge, orderNo, projectId, userId, billId, fundChannel)
    ));

    return await sequelizeModel.FundChannelFlows.bulkCreate(bulkFlows, {transaction: t});
};

exports.topUp = async(fundChannel, projectId, userId, operatorId, contractId, amount)=>{

    if(!fundChannel){
        return ErrorCode.ack(ErrorCode.CHANNELNOTEXISTS);
    }

    const fundChannelId = fundChannel.id;
    const serviceCharge = exports.serviceCharge(fundChannel, amount);
    const assignNewId = exports.assignNewId;

    log.info(fundChannel, serviceCharge, projectId, userId, contractId, amount);

    const received = amount - _.get(serviceCharge, 'share.user', 0);

    let t;
    try{
        t = await MySQL.Sequelize.transaction({ autocommit: false });

        const result = await Util.PayWithOwed(userId, received, t);

        if(result.code !== ErrorCode.OK){
            throw new Error(result.code);
        }

        const topupFlow = assignNewId({projectId, category: 'topup', amount});
        const flow = await MySQL.Flows.create(topupFlow, {transaction: t});

        const orderNo = assignNewId().id;

        const topUp = assignNewId({
            orderNo: orderNo,
            flowId: flow.id,
            userId,
            contractId,
            projectId,
            amount,
            fundChannelId,
            operator: operatorId
        });
        await MySQL.Topup.create(topUp, {transaction: t});

        await exports.logFlows(MySQL)(serviceCharge, orderNo, projectId
            , userId, 0, fundChannel, t, Typedef.FundChannelFlowCategory.TOPUP);

        await t.commit();

        return result.result;
    }
    catch(e){
        await t.rollback();
        log.error(e, serviceCharge, projectId, userId, contractId, amount);
        return ErrorCode.ack(ErrorCode.DATABASEEXEC);
    }
};

exports.autoApportionment = async(projectId, houseId)=>{
    const auto = (roomIds)=>{
        const count = roomIds.length;
        if(!count){
            return [];
        }
        let base = Math.floor(100/count);
        let suffix = 0;
        if(base*count !==  100){
            suffix = 100 - base * count;
        }

        const minRoomId = _.min(roomIds);
        const share = fp.map(roomId=>{
            if(roomId === minRoomId){
                return {roomId: roomId, value: base + suffix, projectId: projectId, houseId: houseId};
            }
            return {roomId: roomId, value: base, projectId: projectId, houseId: houseId};
        })(roomIds);
        return share;
    };

    const rooms = await MySQL.Rooms.findAll({
        where:{
            houseId: houseId
        },
        attributes: ['id'],
        include:[
            {
                model: MySQL.Contracts,
                as: 'contracts',
                attributes: ['id'],
                where:{
                    status: Typedef.ContractStatus.ONGOING
                }
            }
        ]
    });

    const roomIds = _.compact(fp.map(room=>{
        if(room.contracts.length > 1){
            return room.id;
        }
        return null;
    })(rooms));

    const bulkInsertApportionment = auto(roomIds);

    let t;
    try{
        t = await MySQL.Sequelize.transaction({autocommit: false});

        await MySQL.HouseApportionment.destroy({
            where:{
                projectId: projectId,
                houseId: houseId
            },
            transaction: t
        });

        if(bulkInsertApportionment.length) {
            await MySQL.HouseApportionment.bulkCreate(bulkInsertApportionment, {transaction: t});
        }

        await t.commit();

        return 201;
    }
    catch(e){
        await t.rollback();
        log.error(e, projectId, houseId, bulkInsertApportionment);
        return ErrorCode.ack(ErrorCode.DATABASEEXEC);
    }
};

exports.formatMysqlDateTime = seconds => moment(seconds * 1000).format('YYYY-MM-DD HH:mm:ss');