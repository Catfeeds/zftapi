'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
// const _ = require('lodash');
const moment = require('moment');
// const common = Include('/services/v1.0/common');

function reGroupDetail(devices, contracts, devicePrices, timeTo) {

    const ONEDAY = 86400;
    const belongTo = (dateA, dateB)=>{
        return !(dateA[0] > dateB[1] || dateA[1] < dateB[0]);
    };
    const subtractDay = (date)=>{
        return date - ONEDAY;
    };
    const matchItem = (dateBase, items)=>{
        const length = items.length;
        for(let i=0; i<length; i++){
            const item = items[i];

            const startDate = item.startDate || item.from;
            const endDate = item.endDate || item.to || timeTo;

            if(dateBase[0] > endDate || dateBase[1] < startDate){
                continue;
            }

            if(dateBase[0] < startDate){
                return {
                    startDate: dateBase[0],
                    endDate: subtractDay(startDate)
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
        return [
            obj.startDate || obj.from || 0,
            obj.endDate || obj.to || timeTo
        ];
    };

    let details = [];

    devices.map(device=>{
        const deviceDate = getDate(device);
        const dateBase = getDate(device);
        for(;;) {
            const contract = matchItem(dateBase, contracts);
            // console.info(debugLog(contract));

            const housePrice = matchItem(dateBase, devicePrices);
            // console.info(debugLog(housePrice));

            const date = minDate(getDate(contract), getDate(housePrice));

            // console.info(date, device.deviceId, contract && contract.item.id, fp.getOr(null)('item.price')(housePrice));
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

            if(date[1] >= deviceDate[1]){
                break;
            }
        }
    });

    return details;
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
            if (!Util.ParameterCheck(query, ['startDate', 'endDate'])) {
                return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED, {error: 'missing starteDate/endDate'}));
            }

            const timeFrom = moment.unix(req.query.startDate).startOf('days').unix();
            const timeTo = moment.unix(req.query.endDate).endOf('days').unix();

            const houseFormat = req.query.houseFormat;

            const pagingInfo = Util.PagingInfo(req.query.index, req.query.size, false);

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
                    fp.assign(
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
                                                    startDate:{$lte: timeFrom},
                                                    endDate:{
                                                        $or:[
                                                            {$gte: timeTo},
                                                            {$eq: 0}
                                                        ]
                                                    },
                                                }
                                            },
                                            {
                                                model: MySQL.Contracts,
                                                as: 'contracts',
                                                required: false,
                                                where:{
                                                    from: {$lt: timeFrom},
                                                    to: {$gt: timeTo},
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
                                // {
                                //     model: MySQL.HouseDevices,
                                //     as: 'devices',
                                //     required: false,
                                //     attributes: ['deviceId', 'public'],
                                //     where:{
                                //         endDate: 0,
                                //         public: true
                                //     }
                                // },
                                , {
                                    model: MySQL.HouseDevicePrice,
                                    as: 'prices',
                                    required: false,
                                    where:{
                                        endDate: 0
                                    }
                                }
                            ]
                        },
                        pagingInfo ? {offset: pagingInfo.skip, limit: pagingInfo.size} : {}
                    )
                );

                const contractIds = fp.flattenDeep(fp.map(house=>{
                    //
                    return fp.map(room=>{
                        //
                        return fp.map(contract=>{return contract.id;})(room.contracts);
                    })(house.rooms);
                })(houses));

                const sql = `select dpp.contractId, sum(amount) as amount, sum(\`usage\`) as \`usage\`, price, min(createdAt) as startDate, max(createdAt) as endDate 
                    from(
                    select contractId, amount,\`usage\`,price,createdAt
                    from devicePrePaid
                        where contractId IN (${contractIds.toString()}) and createdAt BETWEEN ${timeFrom} and ${timeTo}
                     order by createdAt desc 
                    ) as dpp group by contractId, price order by startDate asc`;
                MySQL.Exec(sql).then(
                    result=>{
                        //
                        const returnRoom = fp.flatten(fp.map(house=>{
                            return fp.compact(fp.map(room=>{
                                const devices = room.devices;
                                const contracts = room.contracts;
                                const devicePrices = fp.flatten(fp.map(contract=>{
                                    return fp.compact(fp.map(price=>{
                                        return price.contractId === contract.id ? price : null;
                                    })(result));
                                })(contracts));

                                let groupedDetails;
                                try{
                                    groupedDetails = reGroupDetail(devices, contracts, devicePrices, parseInt(timeTo));
                                }
                                catch(e){
                                    log.error(e, groupedDetails, room);
                                }

                                const details = fp.map(detail=>{
                                    return fp.assign(
                                        {
                                            device:{
                                                deviceId: fp.getOr('')('device.deviceId')(detail),
                                                startDate: fp.getOr(0)('device.startDate')(detail),
                                                endDate: fp.getOr(0)('device.endDate')(detail),
                                            },
                                            contract:{
                                                userName: fp.getOr('')('contract.item.user.name')(detail),
                                                startDate: fp.getOr(0)('contract.startDate')(detail),
                                                endDate: fp.getOr(0)('contract.endDate')(detail),
                                            },
                                        },
                                        fp.getOr(null)('price.item')(detail) ? {
                                            usage: parseInt( fp.getOr(0)('price.item.usage')(detail))/10000,
                                            price: parseInt( fp.getOr(0)('price.item.price')(detail))/100,
                                            amount: parseInt( fp.getOr(0)('price.item.amount')(detail))/100
                                        } : {}
                                    );
                                })(groupedDetails);

                                return {
                                    roomId: room.id,
                                    building: house.building.building,
                                    unit: house.building.unit,
                                    roomNumber: house.roomNumber,
                                    location: house.building.location,
                                    details: details,
                                };

                            })(house.rooms));
                        })(houses));

                        res.send(returnRoom);
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
