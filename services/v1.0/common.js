'use strict';

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
        const where = fp.extendAll([{},
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
            query.bedRoom ? {'$layouts.bedRoom$': query.bedRoom} : {}]
        );

        const queryInclude = fp.union(
            [
                {
                    model: MySQL.Building, as: 'building',
                    include: [
                        {
                            model: MySQL.GeoLocation, as: 'location',
                        }],
                },
                {model: MySQL.Layouts, as: 'layouts'},
                {
                    model: MySQL.Rooms,
                    as: 'rooms',
                    include: [
                        {
                            model: MySQL.HouseDevices,
                            as: 'devices',
                        }],
                },
            ])(include ? include : []);


        const pagingInfo = Util.PagingInfo(query.index, query.size, true);

        Promise.all([
            MySQL.Houses.count(
                fp.assignIn({
                    where: where,
                })(attributes ? attributes:{})
            ),
            MySQL.Houses.findAll(
                fp.assignIn({
                    where: where,
                    subQuery: false,
                    include: queryInclude,
                    offset: pagingInfo.skip,
                    limit: pagingInfo.size
                })(attributes ? attributes:{})
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

const defaultWhere = {where: {}};

exports.includeContracts = (sequelizeModel, forceRequired) =>
    (houseFormat, contractCondition, locationCondition) => fp.defaults({
        include: [exports.userConnection(sequelizeModel), exports.houseConnection(sequelizeModel, forceRequired)(houseFormat, locationCondition)],
        model: sequelizeModel.Contracts
    })(fp.isUndefined(contractCondition) ? {
        where: {
            status: Typedef.ContractStatus.ONGOING
        }
    } : contractCondition);

exports.houseConnection = (sequelizeModel, forceRequired) => (houseFormat, locationCondition) => {
    const houseInclude = fp.defaults({
        model: sequelizeModel.Houses,
        as: 'house',
        attributes: ['id', 'roomNumber', 'buildingId'],
        required: forceRequired ? forceRequired.required : true,
        include: [{
            model: sequelizeModel.Building, as: 'building',
            required: forceRequired ? forceRequired.required : true,
            attributes: ['building', 'unit'],
            include: [fp.defaults(locationCondition ? locationCondition : defaultWhere)({
                model: sequelizeModel.GeoLocation,
                as: 'location',
                attributes: ['name']
            })]
        }]
    })(fp.isEmpty(houseFormat) ? {where: {}} : {where: {houseFormat}});
    return {
        model: sequelizeModel.Rooms,
        attributes: ['id', 'name', 'houseId'],
        required: forceRequired ? forceRequired.required : true,
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

    return fp.assign(device.status || {}, {service: runStatus()});
};

exports.payBills = (sequelizeModel) => async (bills, projectId, fundChannel, userId, orderNo, category='rent', flowDirection='receive') => {
    if(fp.isEmpty(bills)) {
        return ErrorCode.ack(ErrorCode.OK, {message: 'No bills were paid.'});
    }
    const billsToPay = fp.map(bill=>({
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
        category,
        direction: flowDirection,
        amount: bill.amount,
        fee: bill.serviceCharge.shareAmount,
    }))(billsToPay);

    let t;
    try{
        t = await sequelizeModel.Sequelize.transaction({autocommit: false});

        await sequelizeModel.BillPayment.bulkCreate(billsToPay, {transaction: t});
        await sequelizeModel.Flows.bulkCreate(flows, {transaction: t});

        const billLogFlows = fp.map(bill => exports.logFlows(sequelizeModel)(bill.serviceCharge,
            bill.orderNo, projectId, bill.operator, bill.billId,
            fundChannel, t, Typedef.FundChannelFlowCategory.BILL))(billsToPay);
        await Promise.all(billLogFlows);

        await t.commit();
        return ErrorCode.ack(ErrorCode.OK);
    }
    catch(e){
        await t.rollback();
        log.error(e, bills, projectId, fundChannel, userId, orderNo, billsToPay, flows);
        return ErrorCode.ack(ErrorCode.DATABASEEXEC);
    }
};

exports.serviceCharge = (fundChannel, amount)=>{
    //
    let chargeObj = {
        amount,
        amountForBill: amount,
        shareAmount: 0
    };

    fp.each(serviceCharge=>{
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
    })(fundChannel.serviceCharge);

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
    return fp.compact([
        fp.get('share.user')(serviceCharge) ?
            fp.assign(
                exports.baseFlow(category, orderNo, projectId, billId, fundChannel, fp.get('share.user')(serviceCharge))
                , {
                    from: userId,
                    to: Typedef.PlatformId,
                }
            ) : null
        , fp.get('share.project')(serviceCharge)  ?
            fp.assign(
                //TODO: 怀疑是拷贝粘贴错误 @joey  'share.user' => 'share.project'
                exports.baseFlow(category, orderNo, projectId, billId, fundChannel, fp.get('share.project')(serviceCharge))
                , {
                    from: projectId,
                    to: Typedef.PlatformId,
                }
            ) : null
    ]);
};
exports.platformFlows = (serviceCharge, orderNo, projectId, userId, billId, fundChannel)=>{
    const category = Typedef.FundChannelFlowCategory.COMMISSION;
    return fp.compact([
        fundChannel.fee ?
            fp.assign(
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
        fp.assign(
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
        fp.assign(
            exports.baseFlow(category, orderNo, projectId, billId, fundChannel, amount)
            ,{
                from: 0,
                to: userId,
            }
        )
    ];
};

exports.logFlows = (sequelizeModel) => async (
    serviceCharge, orderNo, projectId, userId, billId, fundChannel, t,
    category) => {

    const businessFlow = category === Typedef.FundChannelFlowCategory.BILL ?
        exports.billFlows(serviceCharge.amountForBill, orderNo, projectId,
            userId, billId, fundChannel)
        : exports.topupFlows(serviceCharge.amount, orderNo, projectId, userId,
            billId, fundChannel);
    const bulkFlows = fp.compact(fp.flatten([businessFlow,
        exports.shareFlows(serviceCharge, orderNo, projectId, userId, billId,
            fundChannel),
        exports.platformFlows(serviceCharge, orderNo, projectId, userId, billId,
            fundChannel)]));

    return await sequelizeModel.FundChannelFlows.bulkCreate(bulkFlows,
        {transaction: t});
};

exports.topUp = async(fundChannel, projectId, userId, operatorId, contractId, amount)=>{

    if(!fundChannel){
        return ErrorCode.ack(ErrorCode.CHANNELNOTEXISTS);
    }

    const fundChannelId = fundChannel.id;
    const serviceCharge = exports.serviceCharge(fundChannel, amount);
    const assignNewId = exports.assignNewId;

    log.info(fundChannel, serviceCharge, projectId, userId, contractId, amount);

    const received = amount - fp.getOr(0)('share.user')(serviceCharge);

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

        const minRoomId = fp.min(roomIds);
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

    const allRoomIds = fp.map('id');
    const whichHasMoreThanOneContracts = fp.filter(room => fp.getOr(0)('contracts.length')(room) > 1);
    const roomIds = allRoomIds(whichHasMoreThanOneContracts(rooms));

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

exports.moveFundChannelToRoot = result => {
    const requireServiceCharge= fp.concat('serviceCharge');
    const fromFundChannel = fieldList => fp.pick(fieldList)(result.fundChannel);
    const moveToRoot = fp.assign(result.toJSON());
    const cleanUp = fp.omit('fundChannel');

    return fp.pipe(requireServiceCharge, fromFundChannel, moveToRoot, cleanUp);
};

exports.districtLocation = (query)=>{
    if(query.locationId){
        // geoLocationIds = [query.locationId];
        return {'$building.location.id$': query.locationId};
    }
    else if(query.districtId){
        if(Util.IsParentDivision(query.districtId)){
            return {
                '$building.location.divisionId$': {$regexp: Util.ParentDivision(query.districtId)}
            };
        }
        else{
            return {
                '$building.location.divisionId$': query.districtId
            };
        }
    }
};