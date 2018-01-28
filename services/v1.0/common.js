'use strict';

const _ = require('lodash');
const fp = require('lodash/fp');
const moment = require('moment');
const bigDecimal = require('bigdecimal');

exports.UpsertGeoLocation = (location, t)=>{
    return MySQL.GeoLocation.findOrCreate({
        where:{
            code: location.code
        },
        transaction: t,
        defaults:location
    });
};

exports.AsyncUpsertGeoLocation = async (location, t) => {
    location.code = location.id || location.code;
    location = _.omit(location, 'id');

    return await MySQL.GeoLocation.findOrCreate({
        where:{
            code: location.code
        },
        transaction: t,
        defaults:location
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

exports.userConnection = (userModel) => ({
    model: userModel
});
exports.houseConnection = (houseModel, buildingModel, locationModel, roomModel) => (houseFormat) => {
    const houseInclude = fp.defaults({
        model: houseModel,
        as: 'house',
        attributes: ['id', 'roomNumber'],
        include: [{
            model: buildingModel, as: 'building',
            attributes: ['building', 'unit'],
            include: [{
                model: locationModel,
                as: 'location',
                attributes: ['name']
            }]
        }]
    })(fp.isEmpty(houseFormat) ? {} : {where: {houseFormat}});
    return {
        model: roomModel,
        attributes: ['id', 'name'],
        include: [houseInclude]
    };
};

exports.includeContracts = (contractModel, userModel, houseModel, buildingModel, locationModel, roomModel) =>
    (houseFormat, contractCondition) => fp.defaults({
        include: [exports.userConnection(userModel), exports.houseConnection(houseModel, buildingModel, locationModel, roomModel)(houseFormat)],
        model: contractModel
    })(fp.isUndefined(contractCondition) ? {
        where: {
            status: Typedef.ContractStatus.ONGOING
        }
    } : contractCondition);

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

exports.payBills = async (serviceCharge, bills, projectId, fundChannel, userId, orderNo)=>{
    const payBills = fp.map(bill=>{
        return {
            id: exports.assignNewId().id,
            projectId: projectId,
            billId: bill.id,
            orderNo: orderNo ? orderNo : exports.assignNewId().id,
            flowId: exports.assignNewId().id,
            fundChannelId: fundChannel.id,
            amount: bill.dueAmount,
            operator: userId,
            paidAt: moment().unix(),
        };
    })(bills);

    const flows = fp.map(bill=>{
        return {
            id: bill.flowId,
            projectId: projectId,
            category: 'rent'
        };
    })(payBills);

    try{
        const t = await MySQL.Sequelize.transaction();

        await MySQL.BillPayment.bulkCreate(payBills, {transaction: t});
        await MySQL.Flows.bulkCreate(flows, {transaction: t});

        await exports.logFlows(serviceCharge, orderNo, projectId, userId, fundChannel, t, Typedef.FundChannelFlowCategory.BILL);

        await t.commit();
        return ErrorCode.ack(ErrorCode.OK);
    }
    catch(e){
        log.error(e, fundChannelId, userId, payBills, flows);
        return ErrorCode.ack(ErrorCode.DATABASEEXEC);
    }
};

exports.serviceCharge = (fundChannel, amount)=>{
    //

    let chargeObj = {
        amount: amount
    };

    _.each(fundChannel.serviceCharge, serviceCharge=>{
        switch(serviceCharge.type){
        case Typedef.ServiceChargeType.TOPUP:
            {
                const CalcShare = (fee, percent)=>{
                    if(fee && percent){
                        if(amount === 1){
                            return;
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

                chargeObj.share = {
                    user: CalcShare(serviceCharge.strategy.fee, serviceCharge.strategy.user),
                    project: CalcShare(serviceCharge.strategy.fee, serviceCharge.strategy.project),
                };

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

exports.shareFlows = (serviceCharge, orderNo, projectId, userId, fundChannel)=>{
    return _.compact([
        serviceCharge.share && serviceCharge.share.user ? {
            id: exports.assignNewId().id,
            category: Typedef.FundChannelFlowCategory.CHARGETOPUP,
            orderNo: orderNo,
            projectId: projectId,
            fundChannelId: fundChannel.id,
            from: userId,
            to: Typedef.PlatformId,
            amount: serviceCharge.share.user
        } : null,
        serviceCharge.share && serviceCharge.share.project ? {
            id: exports.assignNewId().id,
            category: Typedef.FundChannelFlowCategory.CHARGETOPUP,
            orderNo: orderNo,
            projectId: projectId,
            fundChannelId: fundChannel.id,
            from: projectId,
            to: Typedef.PlatformId,
            amount: serviceCharge.share.project
        } : null,
    ]);
};
exports.platformFlows = (serviceCharge, orderNo, projectId, userId, fundChannel)=>{
    return _.compact([
        fundChannel.fee ? {
            id: exports.assignNewId().id,
            category: Typedef.FundChannelFlowCategory.SERVICECHARGE,
            orderNo: orderNo,
            projectId: projectId,
            fundChannelId: fundChannel.id,
            from: Typedef.PlatformId,
            to: 0,
            amount: serviceCharge.fee
        } : null
    ]);
};
exports.topupFlows = (serviceCharge, orderNo, projectId, userId, fundChannel, category)=>{
    const getAmount = ()=>{
        switch (category){
        case Typedef.FundChannelFlowCategory.BILL:
            return serviceCharge.amountForBill || serviceCharge.amount;
            break;
        default:
            return serviceCharge.amount;
            break;
        }
    };

    return [
        {
            id: exports.assignNewId().id,
            category: Typedef.FundChannelFlowCategory.TOPUP,
            orderNo: orderNo,
            projectId: projectId,
            fundChannelId: fundChannel.id,
            from: 0,
            to: userId,
            amount: getAmount()
        }
    ];
};

exports.logFlows = async(serviceCharge, orderNo, projectId, userId, fundChannel, t, category)=>{

    const bulkFlows = _.compact(_.concat([]
        , exports.topupFlows(serviceCharge, orderNo, projectId, userId, fundChannel, category)
        , exports.shareFlows(serviceCharge, orderNo, projectId, userId, fundChannel)
        , exports.platformFlows(serviceCharge, orderNo, projectId, userId, fundChannel)
    ));

    return await MySQL.FundChannelFlows.bulkCreate(bulkFlows, {transaction: t});
};

exports.topUp = async(fundChannel, projectId, userId, operatorId, contractId, amount)=>{

    if(!fundChannel){
        return ErrorCode.ack(ErrorCode.CHANNELNOTEXISTS);
    }

    const fundChannelId = fundChannel.id;
    const serviceCharge = exports.serviceCharge(fundChannel, amount);
    const assignNewId = exports.assignNewId;

    log.info(fundChannel, serviceCharge, projectId, userId, contractId, amount);

    const received = amount - (serviceCharge && serviceCharge.share && serviceCharge.share.user || 0);
    try{
        const t = await MySQL.Sequelize.transaction();

        const result = await Util.PayWithOwed(userId, received, t);

        if(result.code !== ErrorCode.OK){
            throw new Error(result.code);
        }

        const flow = await MySQL.Flows.create(assignNewId({projectId, category: 'topup'}), {transaction: t});

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

        await exports.logFlows(serviceCharge, orderNo, projectId
            , userId, fundChannel, t, Typedef.FundChannelFlowCategory.TOPUP);

        await t.commit();

        return result.result;
    }
    catch(e){
        log.error(e, serviceCharge, projectId, userId, contractId, amount);
        return ErrorCode.ack(ErrorCode.DATABASEEXEC);
    }
};