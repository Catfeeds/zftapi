'use strict';
/**
 * Operations on /houses
 */
const fp = require('lodash/fp');
const _ = require('lodash');
const moment = require('moment');
const common = Include('/services/v1.0/common');

const MAX_INT = 4294967295;
function reGroupDetail(devices, contracts, devicePrices) {

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
            const endDate = item.endDate || item.to || MAX_INT;

            if(dateBase[0] > endDate || dateBase[1] < startDate){
                continue;
            }

            if(dateBase[0] < startDate){
                return {
                    startDate: dateBase[0],
                    endDate: subtractDay(startDate)
                }
            }

            const date = minDate(dateBase, getDate(item));
            return _.assign({
                    startDate: date[0],
                    endDate: date[1],
                },
                belongTo(date, getDate(item)) ? {item: item} : {}
            );
        }

        return null;
    };
    const minDate = (dateA, dateB)=>{
        const sortedDate = _.sortedUniq( _.concat([], dateA, dateB).sort() );

        if(sortedDate.length < 2){
            return null;
        }

        const value = dateA[0] || dateB[0];
        const index = _.sortedIndexOf(sortedDate, value);
        return [sortedDate[index], sortedDate[index+1]];
    };
    const getDate = (obj)=>{
        if(!obj){
            return [];
        }
        return [
            obj.startDate || obj.from || 0,
            obj.endDate || obj.to || MAX_INT
        ];
    };

    let details = [];
    _.each(devices, device=>{
        const deviceDate = getDate(device);
        const dateBase = getDate(device);
        do {
            const contract = matchItem(dateBase, contracts);
            // console.info(debugLog(contract));

            const housePrice = matchItem(dateBase, devicePrices);
            // console.info(debugLog(housePrice));

            const date = minDate(getDate(contract), getDate(housePrice));

            console.info(date, device.deviceId, contract && contract.item.id, housePrice && housePrice.item.price);
            details.push({
                date: date,
                device: device,
                contract: contract,
                price: housePrice
            });
            if(date) {
                dateBase[0] = date[1];
                dateBase[0] = Number( moment(dateBase[0], 'YYYYMMDD').add(1, 'days').format('YYYYMMDD') );
            }

            if(date[1] === deviceDate[1]){
                break;
            }
        }while(1);
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
            const params = req.params;

            const projectId = req.params.projectId;
            const deviceType = req.query.deviceType;

            const timeFrom = req.query.startDate;
            const timeTo = req.query.endDate;

            const houseFormat = req.query.houseFormat;

            const pagingInfo = Util.PagingInfo(req.query.pageindex, req.query.pagesize, false);

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

            const where = _.assign(
                {
                    projectId: projectId,
                    houseFormat: houseFormat,
                }
                , districtLocation()
            );
            try {
                // const houses = await MySQL.Houses.findAll(
                //     _.assign({
                //         where: where,
                //         attributes:['id'],
                //         include: [
                //             {
                //                 model: MySQL.Rooms
                //                 , as: 'rooms'
                //                 , required: true
                //                 , include:[
                //                     {
                //                         model: MySQL.HouseDevices,
                //                         as: 'devices',
                //                         required: false,
                //                         where:{
                //                             startDate:{$gte: timeFrom},
                //                             endDate:{
                //                                 $or:[
                //                                     {$lte: timeTo},
                //                                     {$eq: 0}
                //                                 ]
                //                             },
                //                         }
                //                     },
                //                     {
                //                         model: MySQL.Contracts,
                //                         as: 'contracts',
                //                         required: false,
                //                         where:{
                //                             from: {$gte: timeFrom},
                //                             to: {$lte: timeTo}
                //                         }
                //                     }
                //                 ]
                //             },
                //             {
                //                 model: MySQL.Building, as: 'building'
                //                 , include: [{
                //                     model: MySQL.GeoLocation, as: 'location', required: true
                //                 }]
                //                 , required: true
                //                 , attributes: ['group', 'building', 'unit'],
                //             },
                //             {
                //                 model: MySQL.HouseDevices,
                //                 as: 'devices',
                //                 required: false,
                //                 attributes: ['deviceId', 'public'],
                //                 where:{
                //                     endDate: 0,
                //                     public: true
                //                 }
                //             },
                //             {
                //                 model: MySQL.HouseDevicePrice
                //                 , as: 'prices'
                //                 , required: false
                //                 , where:{
                //                     category: 'CLIENT',
                //                     startDate:{$gte: timeFrom},
                //                     endDate:{
                //                         $or:[
                //                             {$lte: timeTo},
                //                             {$eq: 0}
                //                         ]
                //                     },
                //                 }
                //             }
                //         ]
                //     },
                //     pagingInfo ? {offset: pagingInfo.skip, limit: pagingInfo.size} : {}
                //     )
                // );

                const houses = await MySQL.Houses.findAll(
                    _.assign(
                        {
                            where: where,
                            attributes:['id'],
                            include: [
                                {
                                    model: MySQL.Rooms
                                    , as: 'rooms'
                                    , required: true
                                    , include:[
                                        // {
                                        //     model: MySQL.HouseDevices,
                                        //     as: 'devices',
                                        //     required: false,
                                        //     where:{
                                        //         startDate:{$gte: timeFrom},
                                        //         endDate:{
                                        //             $or:[
                                        //                 {$lte: timeTo},
                                        //                 {$eq: 0}
                                        //             ]
                                        //         },
                                        //     }
                                        // },
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
                                                    model: MySQL.DevicePrePaid,
                                                    as: 'devicePrePaid',
                                                    required: false
                                                }
                                            ]
                                        }
                                    ]
                                },
                                // {
                                //     model: MySQL.Building, as: 'building'
                                //     , include: [{
                                //         model: MySQL.GeoLocation, as: 'location', required: true
                                //     }]
                                //     , required: true
                                //     , attributes: ['group', 'building', 'unit'],
                                // },
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
                            ]
                        },
                        pagingInfo ? {offset: pagingInfo.skip, limit: pagingInfo.size} : {}
                    )
                );

                //
                // //
                // const roomIds = _.flatten(fp.map(house=>{
                //     return fp.map(room=>{return room.id;})(house.rooms);
                // })(houses));
                // const houseIds = fp.map(house=>{
                //     return house.id;
                // })(houses);
                //
                // //seek contracts
                // const contracts = await MySQL.Contracts.findAll({
                //     where:{
                //         roomId:{$in: roomIds},
                //         from:{$gte: timeFrom},
                //         to:{$lte: timeTo},
                //     }
                // });
                // //seek houseDevicePrices
                // const startDate = moment.unix(timeFrom).format('YYYYMMDD');
                // const endDate = moment.unix(timeTo).format('YYYYMMDD');
                // const houseDevicePrices = await MySQL.HouseDevicePrice.findAll({
                //     where:{
                //         projectId: projectId,
                //         houseId: {$in: houseIds},
                //         startDate:{$gte: startDate},
                //         endDate:{$lte: endDate},
                //     }
                // });



                // _.each(houses, house=>{
                //     const prices = house.prices;
                //     _.each(house.rooms, room=>{
                //         const devices = room.devices;
                //         const contracts = room.contracts;
                //
                //         log.info(house.id, room.id, room.name);
                //         reGroupDetail(devices, contracts, prices);
                //     });
                // });
                
                res.send(houses);
            }
            catch (e){
                log.error(e, projectId, req.query);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            }
        })();
    },
};
