'use strict';

const _ = require('lodash');
const fp = require('lodash/fp');
const moment = require('moment');

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
exports.assignNewId = (model) => fp.defaults({id: SnowFlake.next()})(model);

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
	if (fp.some(suspendingRoom => (now > suspendingRoom.from && fp.isEmpty(suspendingRoom.to)))(lastSuspension)) {
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
	model: userModel, required: true
});
exports.houseConnection = (houseModel, buildingModel, locationModel, roomModel) => (houseFormat) => {
	const houseInclude = fp.defaults({
			model: houseModel,
			as: 'house',
			required: true,
			attributes: ['id', 'roomNumber'],
			include: [{
				model: buildingModel, required: true, as: 'building',
				attributes: ['building', 'unit'],
				include: [{
					model: locationModel, required: true,
					as: 'location',
					attributes: ['name']
				}]
			}]
		})(fp.isEmpty(houseFormat) ? {} : {where: {houseFormat}});
	return {
		model: roomModel,
		required: true,
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

exports.DeviceStatus = (device)=>{
    if(!device || !device.freq || !device.updatedAt){
        return  Typedef.DeviceStatus.OFFLINE;
    }
    const updatedAt = moment(device.updatedAt).unix();
    const now = moment().unix();
    if( updatedAt + device.freq < now ){
        return Typedef.DeviceStatus.OFFLINE;
    }
    else{
        return Typedef.DeviceStatus.ONLINE;
    }
};

exports.PayBills = async (bills, projectId, fundChannelId, userId, orderNo)=>{
    const payBills = fp.map(bill=>{
        return {
            id: exports.assignNewId().id,
            projectId: projectId,
            billId: bill.id,
            orderNo: orderNo ? orderNo : exports.assignNewId().id,
            flowId: exports.assignNewId().id,
            paymentChannel: fundChannelId,
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

        await t.commit();
        return '';
    }
    catch(e){
        log.error(e, fundChannelId, userId, payBills, flows);
        return ErrorCode.ack(ErrorCode.DATABASEEXEC);
    }
};