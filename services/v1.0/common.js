'use strict';

const fp = require('lodash/fp');
const moment = require('moment');
const bigDecimal = require('bigdecimal');
const {topupNotification, billPaymentNotification} = require('./pushService');

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
exports.translateBalance = (balance) => {
    if( fp.isNull(balance) || fp.isNaN(balance) ){
        return 0;
    }
    return balance;
};

exports.scaleUp = (v) => {
    return v * 10000;
};
exports.scaleDown = (v) => {
    return Number( (v / 10000).toFixed(4) );
};

exports.singleRoomTranslate = roomModel => {
    const room = roomModel.toJSON ? roomModel.toJSON() : roomModel;
    const status = room.status;
    const house = room.house;
    const building = house.building;
    const location = building.location;
    return fp.omitBy(fp.isUndefined)({
        id: room.id,
        houseId: house.id,
        locationName: location.name,
        group: building.group,
        building: building.building,
        unit: building.unit,
        roomNumber: house.roomNumber,
        roomName: room.name,
        status,
        devices: room.devices || [],
        manager: room.house.houseKeeper,
    });
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
    model: sequelizeModel.Users,
    include: [
        {
            model: sequelizeModel.Auth,
            attributes: ['mobile'],
        }],
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
        attributes: ['id', 'roomNumber', 'buildingId', 'houseKeeper'],
        required: forceRequired ? forceRequired.required : true,
        paranoid: false,
        include: [{
            model: sequelizeModel.Building, as: 'building',
            required: forceRequired ? forceRequired.required : true,
            attributes: ['building', 'unit'],
            paranoid: false,
            include: [fp.defaults(locationCondition ? locationCondition : defaultWhere)({
                model: sequelizeModel.GeoLocation,
                as: 'location',
                attributes: ['name'],
                paranoid: false,
            })]
        }]
    })(fp.isEmpty(houseFormat) ? {where: {}} : {where: {houseFormat}});

    const deviceInclude = {
        model: sequelizeModel.HouseDevices,
        as: 'devices',
        attributes: ['deviceId'],
        required: false
    };
    return {
        model: sequelizeModel.Rooms,
        attributes: ['id', 'name', 'houseId'],
        required: forceRequired ? forceRequired.required : true,
        paranoid: false,
        include: [houseInclude, deviceInclude]
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
        sendPaymentNotifications(sequelizeModel)(bills);
        return ErrorCode.ack(ErrorCode.OK);
    }
    catch(e){
        await t.rollback();
        log.error(e, bills, projectId, fundChannel, userId, orderNo, billsToPay, flows);
        return ErrorCode.ack(ErrorCode.DATABASEEXEC);
    }
};

const sendPaymentNotifications = sequelizeModel => fp.each(bill => billPaymentNotification(sequelizeModel)({
    userId: bill.dataValues.userId,
    dueAmount: bill.dueAmount,
    startDate: bill.startDate,
    endDate: bill.endDate,
    paidAt: moment().unix(),
}));

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

    const fundChannelId = fundChannel.fundChannelId || fundChannel.id;
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

        const topupFlow = assignNewId({projectId, category: 'topup', amount, fee: serviceCharge.shareAmount});
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

        topupNotification(MySQL)(result.result);
        await t.commit();
        return result;
    }
    catch(e){
        await t.rollback();
        log.error(e, serviceCharge, projectId, userId, contractId, amount);
        return ErrorCode.ack(ErrorCode.DATABASEEXEC);
    }
};

exports.defaultDeviceShare = (projectId, houseId, roomIds) => {
    const count = roomIds.length;
    if (!count) {
        return [];
    }
    let base = Math.floor(100 / count);
    let suffix = 0;
    if (base * count !== 100) {
        suffix = 100 - base * count;
    }

    const minRoomId = fp.min(roomIds);
    return fp.map(roomId => {
        if (roomId === minRoomId) {
            return {
                roomId,
                value: base + suffix,
                projectId,
                houseId,
            };
        }
        return {
            roomId,
            value: base,
            projectId: projectId,
            houseId,
        };
    })(roomIds);
};

exports.formatMysqlDateTime =
    seconds => moment(seconds * 1000).format('YYYY-MM-DD HH:mm:ss');
exports.mysqlDateTimeToStamp = time => moment(time).unix();

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

exports.getDeviceId = (deviceId)=>{
    return exports.getAddrId(deviceId);
};
exports.getBuildingId = (deviceId)=>{
    return deviceId.substr(0, 10);
};
exports.getAddrId = (deviceId)=>{
    return deviceId.substr(3);
};

exports.includeHouseDevices =(isPublic)=>{
    return {
        model: MySQL.HouseDevices,
        as: 'devices',
        required: false,
        attributes: ['deviceId', 'public'],
        where:{
            endDate: 0,
            public: isPublic
        },
        include:[
            {
                model: MySQL.Devices,
                as: 'device',
                include:[
                    {
                        model: MySQL.DevicesChannels,
                        as: 'channels'
                    }
                ]
            }
        ]
    };
};
exports.includeRoomContracts = (status)=>{
    const contractOptions = ()=> {
        switch (status) {
        case 'ONGOING': {
            return {
                where: {
                    status: Typedef.ContractStatus.ONGOING
                },
                required: true
            };
        }
        case 'EXPIRED': {
            return {
                where: {
                    status: Typedef.ContractStatus.ONGOING,
                    to: {$lte: moment().unix()}
                },
                required: true
            };
        }
        }
    };

    return fp.assign({
        model: MySQL.Contracts,
        required: false,
        where: {

            status: Typedef.ContractStatus.ONGOING,
        },
        order: ['from asc'],
        include: [
            {
                model: MySQL.Users,
                include:[
                    {
                        model: MySQL.Auth,
                        attributes: ['mobile']
                    }
                ]
            },
        ],
    })(contractOptions());
};
exports.includeRoom = async(status)=>{

    const getWhere = async()=>{
        if(status === 'IDLE'){
            const contracts = await MySQL.Contracts.findAll({
                where:{
                    projectId: projectId,
                    status: Typedef.ContractStatus.ONGOING
                },
                attributes: ['roomId']
            });
            const roomIds = fp.map(contract=>{return contract.roomId;})(contracts);
            return {
                where:{
                    id: {
                        $notIn: roomIds
                    }
                }
            };
        }
        else if(status === 'CLOSED' ){
            const suspendings = await MySQL.SuspendingRooms.findAll({
                where:{
                    to: 0
                },
                attributes: ['roomId']
            });
            const roomIds = fp.map(suspending=>{return suspending.roomId;})(suspendings);
            return {
                where:{
                    id: {
                        in: roomIds
                    }
                }
            };
        }
        else{
            return null;
        }
    };

    const where = await getWhere();

    return fp.assign(
        {
            model: MySQL.Rooms,
            as: 'rooms',
            attributes: [
                'id',
                'config',
                'name',
                'people',
                'type',
                'roomArea',
                'orientation'],
            required: true,
            include: [
                exports.includeHouseDevices(false),
                exports.includeRoomContracts(status),
                {
                    model: MySQL.SuspendingRooms,
                    required: false,
                    where: {
                        to: {
                            $eq: null,
                        },
                    },
                    attributes: ['id', 'from', 'to', 'memo'],
                },
            ],
        })( where ? where : {} );
};

exports.translateDevices = (devices)=>{
    const whichHasDevice = fp.reject(fp.flow(fp.get('device'), fp.isEmpty));
    const transform = fp.map(device=> ({
        deviceId: device.device.deviceId,
        public: device.public,
        title: device.device.name,
        scale: device.device.channels && exports.scaleDown(device.device.channels[0].scale),
        type: device.device.type,
        updatedAt: moment(device.device.updatedAt).unix(),
        status: exports.deviceStatus(device.device)
    }));
    return transform(whichHasDevice(devices));
};
exports.translateRooms = (rooms)=> {
    return fp.map(room => {
        const getContract = () => {
            if (!room.contracts || !room.contracts.length) {
                return {};
            }
            else {
                const contract = room.contracts[0];
                return {
                    id: contract.id,
                    from: contract.from,
                    to: contract.to,
                    userId: contract.user.id,
                    name: contract.user.name,
                    contractNumber: contract.contractNumber,
                    rent: fp.get('strategy.freq.rent')(contract)
                };
            }
        };
        const getSuspending = () => {
            if (!room.suspendingRooms || !room.suspendingRooms.length) {
                return {};
            }
            else {
                return room.suspendingRooms[0];
            }
        };
        const devices = exports.translateDevices(room.devices);

        return fp.assignIn(fp.omit(['contracts', 'devices'])(room))(
            {
                contract: getContract(),
                suspending: getSuspending(),
                devices: devices,
                status: exports.roomLeasingStatus(room.contracts, room.suspendingRooms),
            },
        );

    })(rooms);
};

exports.pickAuthAttributes = item => {
    const json = item.user.toJSON();
    return fp.defaults(item)({user: fp.defaults(json)(
        {accountName: json.auth.username, id: json.auth.id, mobile: json.auth.mobile})});
};

exports.convertRoomNumber = (index)=>{
    const ALPHACOUNT = 24;
    const prefix = parseInt(index/ALPHACOUNT);
    const suffix = index % ALPHACOUNT;

    return fp.repeat(prefix)('A') + String.fromCharCode(64+suffix);
};