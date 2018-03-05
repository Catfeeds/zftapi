'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
// const _ = require('lodash');
const moment = require('moment');
const common = Include('/services/v1.0/common');

function reGroupDetail(devices, contracts, devicePrices, timeFrom, timeTo) {

    if(!contracts.length && !devicePrices.length){
        return [];
    }

    const belongTo = (dateA, dateB)=>{
        return !(dateA[0] > dateB[1] || dateA[1] < dateB[0]);
    };
    const matchItem = (dateBase, items)=>{
        const length = items.length;
        for(let i=0; i<length; i++){
            const item = items[i];

            const itemDate = getDate(item);
            if(dateBase[0] > itemDate[1] || dateBase[1] < itemDate[0]){
                continue;
            }

            if(dateBase[0] < itemDate[0]){
                return {
                    startDate: dateBase[0],
                    endDate: dateBase[1]
                };
            }

            const date = minDate(dateBase, getDate(item));
            return fp.assign(
                {
                    startDate: date[0],
                    endDate: date[1],
                },
                belongTo(date, getDate(item)) ? {item: item} : {}
            );
        }

        return null;
    };
    const minDate = (dateA, dateB)=>{
        const sortedDate = fp.sortedUniq( fp.concat(dateA, dateB).sort() );

        if(sortedDate.length < 2){
            return null;
        }

        const value = dateA[0] || dateB[0];
        const index = sortedDate.indexOf(value);
        return [sortedDate[index], sortedDate[index+1]];
    };
    const getDate = (obj)=>{
        if(!obj){
            return [];
        }

        const originStartDate = obj.startDate || obj.from || timeFrom;
        const originEndDate = obj.endDate || obj.to || timeTo;

        return [
            moment.unix(originStartDate < timeFrom ? timeFrom : originStartDate).startOf('days').unix(),
            moment.unix(originEndDate > timeTo ? timeTo : originEndDate).startOf('days').unix()
        ];
    };

    let details = [];

    devices.map(device=>{
        const deviceDate = getDate(device);
        const dateBase = getDate(device);
        for(;;) {
            const contract = matchItem(dateBase, contracts);

            const housePrice = matchItem(dateBase, devicePrices);

            const date = minDate(getDate(contract), getDate(housePrice));

            // console.info(date, device.deviceId, fp.getOr(null)('item.id')(contract), fp.getOr(null)('item.price')(housePrice));
            details.push({
                date: date,
                device: device,
                contract: contract,
                price: housePrice
            });
            if(date) {
                dateBase[0] = date[1];
                dateBase[0] = moment.unix(dateBase[0]).add(1, 'days').unix();
            }
            else{
                break;
            }

            if(date[1] >= deviceDate[1]){
                break;
            }
        }
    });


    return fp.reverse( details );
}

module.exports = {
    get: (req, res)=>{
        /**
		 * Get the data for response 200
		 * For response `default` status 200 is used.
		 */
        (async()=>{
            const query = req.query;
            // const params = req.params;

            const projectId = req.params.projectId;
            const roomId = query.roomId;
            // const deviceType = req.query.deviceType;
            if (!Util.ParameterCheck(query, ['houseFormat', 'startDate', 'endDate'])) {
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, {error: 'missing starteDate/endDate'}));
            }

            const timeFrom = moment.unix(req.query.startDate).startOf('days').unix();
            const timeTo = moment.unix(req.query.endDate).startOf('days').unix();

            const ymdTimeFrom = parseInt( moment.unix(req.query.startDate).startOf('days').format('YYYYMMDD') );
            const ymdTimeTo = parseInt( moment.unix(req.query.endDate).startOf('days').format('YYYYMMDD') );

            const houseFormat = req.query.houseFormat;

            const pagingInfo = Util.PagingInfo(req.query.index, req.query.size, true);

            const districtLocation = ()=>{
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

                return {};
            };

            const where = fp.assign(
                {
                    projectId: projectId,
                    houseFormat: houseFormat,
                }
                , districtLocation()
            );
            try {
                const houses = await MySQL.Houses.findAll(
                    {
                        where: where,
                        include: [
                            fp.assign(
                                {
                                    model: MySQL.Rooms
                                    , as: 'rooms'
                                    , required: true
                                    , include:[
                                        {
                                            model: MySQL.HouseDevices,
                                            as: 'devices',
                                            required: false,
                                            where:{
                                                $or:[
                                                    {startDate:{$lte: timeTo}}
                                                    ,{
                                                        endDate:{
                                                            $or:[
                                                                {$gte: timeFrom},
                                                                {$eq: 0}
                                                            ]
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                        {
                                            model: MySQL.Contracts,
                                            as: 'contracts',
                                            required: false,
                                            where:{
                                                $or:[
                                                    {from: {$lte: timeFrom}, to: {$gte: timeFrom}},
                                                    {from: {$lte: timeTo}, to: {$gte: timeTo}},
                                                    {from: {$gte: timeFrom}, to: {$lte: timeTo}},
                                                ],
                                            },
                                            include:[
                                                {
                                                    model: MySQL.Users,
                                                    as: 'user',
                                                    required: true
                                                }
                                            ]
                                        }
                                    ]
                                },
                                roomId ? {
                                    where:{
                                        id: roomId
                                    }
                                } : {}
                            )
                            , {
                                model: MySQL.Building, as: 'building'
                                , include: [{
                                    model: MySQL.GeoLocation, as: 'location', required: true
                                }]
                                , required: true
                                , attributes: ['group', 'building', 'unit'],
                            }
                            , {
                                model: MySQL.HouseDevices,
                                as: 'devices',
                                required: false,
                                where:{
                                    endDate: 0,
                                    public: true
                                }
                            },
                        ]
                    }
                );

                const houseAndRooms = fp.flatten(fp.map(house=>{
                    const plain = house.toJSON();

                    const rooms = fp.map(room=>{ return fp.extendAll([ room, {building: house.building}, {roomNumber: house.roomNumber} ]); })(plain.rooms);

                    if(houseFormat !== Typedef.HouseFormat.SHARE || roomId){
                        return rooms;
                    }
                    else {
                        return fp.flatten([plain, rooms]);
                    }

                })(houses));

                //
                const doPaging = (data)=>{
                    return data.slice(pagingInfo.skip, pagingInfo.skip+pagingInfo.size);
                };
                const pagedHouseRooms = doPaging(houseAndRooms);

                const contractIds = fp.flattenDeep(fp.compact(fp.map(slot=>{
                    //
                    if(slot.rooms){
                        return null;
                    }
                    else{
                        return fp.map(contract=>{ return contract.id; })(slot.contracts);
                    }
                })(pagedHouseRooms)));
                const houseIds = fp.compact(fp.map(slot=>{
                    if(slot.rooms){
                        return slot.id;
                    }
                    return null;
                })(pagedHouseRooms));

                const sql = `select dpp.contractId, sum(amount) as amount, sum(\`usage\`) as \`usage\`, price
                    , min(createdAt) as startDate, max(createdAt) as endDate, max(scale) as scale
                    from(
                    select contractId, amount,\`usage\`,price, scale, createdAt
                    from devicePrePaid
                        where projectId=${projectId} and contractId IN (${contractIds.toString()}) and createdAt BETWEEN ${timeFrom} and ${timeTo}
                     order by createdAt desc 
                    ) as dpp group by contractId, price order by startDate asc`;
                const houseBillsQuery = `select deviceId, houseId, sum(amount) as amount, sum(\`usage\`) as \`usage\`, price
                    , min(createdAt) as startDate, max(createdAt) as endDate, max(scale) as scale
                    from(
                    select hb.houseId, deviceId, hbf.amount,\`usage\`,price, scale, hbf.createdAt
                    from housesBillsFlows as hbf inner join housesBills as hb on hbf.billId=hb.billId
                        where hb.projectId=${projectId} and hb.houseId IN (${houseIds.toString()}) and hbf.createdAt BETWEEN ${ymdTimeFrom} and ${ymdTimeTo}
                     order by createdAt desc 
                    ) as hbfs group by deviceId, price order by startDate asc`;

                Promise.all([
                    MySQL.Exec(sql),
                    MySQL.Exec(houseBillsQuery)
                ]).then(
                    result=>{
                        //
                        const devicePrePaid = result[0];
                        const housePaid = fp.map(paid=>{
                            paid.startDate = moment(paid.startDate, 'YYYYMMDD').unix();
                            paid.endDate = moment(paid.endDate, 'YYYYMMDD').unix();
                            return paid;
                        })(result[1]);

                        const returnData = fp.map(slot=>{

                            const getDetails = (groupedDetails)=>{
                                return fp.map(detail=>{
                                    const startDate = fp.getOr(0)('date[0]')(detail);
                                    const endDate = fp.getOr(0)('date[1]')(detail);

                                    const usage = parseInt( fp.getOr(0)('price.item.usage')(detail));
                                    const startScale = (fp.getOr(0)('price.item.scale')(detail)-usage)/10000;
                                    const endScale = (fp.getOr(0)('price.item.scale')(detail))/10000;
                                    return fp.extendAll([
                                        {
                                            statDate: startDate > timeFrom ? startDate:timeFrom,
                                            endDate: endDate > timeTo ? timeTo:endDate,
                                            device:{
                                                deviceId: fp.getOr('')('device.deviceId')(detail)
                                            },
                                        }
                                        , detail.contract ? {
                                            contract:{
                                                userId: fp.getOr(0)('contract.item.userId')(detail),
                                                userName: fp.getOr('')('contract.item.user.name')(detail),
                                                startDate: fp.getOr(0)('contract.startDate')(detail),
                                                endDate: fp.getOr(0)('contract.endDate')(detail),
                                            }
                                        } : {}
                                        , detail.price ? {
                                            price: parseInt( fp.getOr(0)('price.item.price')(detail))/100
                                            , amount: parseInt( fp.getOr(0)('price.item.amount')(detail))/100
                                            , usage: parseInt( common.scaleDown(usage) )
                                            , startScale: startScale
                                            , endScale: endScale
                                        } : {}
                                    ]);
                                })(groupedDetails);
                            };

                            if(slot.rooms){
                                //public device
                                const house = slot;
                                const devices = house.devices;
                                const houseDeviceIds = fp.map(device=>{return device.deviceId;})(house.devices);
                                const housePrices = fp.compact(fp.map(paid=>{
                                    if(fp.contains(houseDeviceIds, paid.deviceId)){
                                        paid.endDate++;
                                        return paid;
                                    }
                                    return null;
                                })(housePaid));

                                const groupedDetails = reGroupDetail(devices, [], housePrices, timeFrom, timeTo);
                                return {
                                    building: house.building.building,
                                    unit: house.building.unit,
                                    roomNumber: house.roomNumber,
                                    location: house.building.location,
                                    details: getDetails(groupedDetails),
                                };

                            }
                            else{
                                const room = slot;
                                //room
                                const devices = room.devices;
                                //end of contract have to subtract 1 day
                                const contracts = room.contracts;
                                const devicePrices = fp.flatten(fp.map(contract=>{
                                    return fp.compact(fp.map(price=>{
                                        if( price.contractId === contract.id ){
                                            price.endDate ++;
                                            return price;
                                        }
                                        return null;
                                    })(devicePrePaid));
                                })(contracts));
                                const groupedDetails = reGroupDetail(devices, contracts, devicePrices, timeFrom, timeTo);

                                return {
                                    roomId: room.id,
                                    building: room.building.building,
                                    unit: room.building.unit,
                                    roomNumber: room.roomNumber,
                                    roomName: room.name,
                                    location: room.building.location,
                                    details: getDetails(groupedDetails),
                                };
                            }

                        })(pagedHouseRooms);


                        res.send({
                            paging:{
                                count: houseAndRooms.length,
                                index: pagingInfo.index,
                                size: pagingInfo.size
                            },
                            data: returnData
                        });
                    }
                );
            }
            catch (e){
                log.error(e, projectId, req.query);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        })();
    },
};
