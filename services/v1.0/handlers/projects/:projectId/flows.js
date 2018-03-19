'use strict';

const fp = require('lodash/fp');
const moment = require('moment');
const {
    innerValues, omitSingleNulls, formatMysqlDateTime,
    includeContracts, singleRoomTranslate, districtLocation,
} = require(
    '../../../common');
const {fundFlowConnection} = require('../../../models');

const {ParentDivision} = require('../../../../../libs/util');

const {
    groupByLocationIds, groupMonthByLocationIds, groupHousesByLocationId,
    groupHousesMonthlyByLocationId, generateDivisionCondition,
    groupChannelByLocationIds,
} = require(
    '../../../rawSqls');

const omitFields = fp.omit([
    'userId', 'billId', 'bill', 'auth', 'topup',
    'billpayment', 'operatorInfo', 'flowId', 'createdAt', 'updatedAt',
    'contractId', 'fee', 'locationId', 'locationName',
]);

const formatTime = time => item => fp.defaults(item)(
    {paidAt: moment(fp.get(time)(item)).unix()});

const formatRoom = room => item => fp.defaults(item)(
    {room: singleRoomTranslate(fp.get(room)(item))});

const formatUser = user => item => fp.defaults(item)({
    user: fp.pick(['accountName', 'name', 'id', 'mobile'])(fp.get(user)(item)),
});

const formatContract = contract => item => fp.defaults(item)({
    contract: fp.pick(['id', 'from', 'to', 'status', 'actualEndDate'])(
        fp.get(contract)(item)),
});

const formatBillItems = billItems => item => fp.defaults(item)({
    billItems: fp.get(billItems)(item),
});

const formatFundChannelFlows = fundFlows => item => fp.defaults(item)({
    fundChannelFlows: fp.get(fundFlows)(item),
});

const formatOperator = operator => item => fp.defaults(item)(
    {operator: fp.get(operator)(item)});

const inheritRemark = item => fp.defaults(item)(
    {remark: fp.get('remark')(item)});

const translate = (models, pagingInfo) => {
    const singleBillPayment = fp.pipe(innerValues, omitSingleNulls,
        formatRoom('bill.contract.room'),
        formatOperator('auth'), formatUser('bill.contract.user'),
        formatContract('bill.contract'), formatBillItems('bill.billItems'),
        formatFundChannelFlows('bill.fundChannelFlows'), inheritRemark,
        omitFields);
    const singleTopUp = fp.pipe(innerValues, omitSingleNulls,
        formatRoom('contract.room'),
        formatUser('contract.user'), formatContract('contract'),
        formatOperator('operatorInfo'), formatTime('createdAt'), inheritRemark,
        omitFields);

    const single = (item) => fp.pipe(omitSingleNulls, omitFields)(
        fp.defaults(
            !fp.isNull(item.topup) ?
                singleTopUp(item.topup) : singleBillPayment(item.billpayment))(
            item.dataValues));

    return {
        paging: {
            count: models.count,
            index: pagingInfo.index,
            size: pagingInfo.size,
        },
        data: fp.map(single)(models.rows),
    };
};

const reduceByParams = (source, category) => {
    if (fp.includes(source)(['topup', 'rent']) && category === 'fee') {
        return fp.sumBy(`${source}Fee`);
    }

    if (fp.includes(source)(['topup', 'rent']) && category === 'income') {
        return fp.sumBy(`${source}`);
    }
    if (source === 'all' && category === 'fee') {
        return fp.sumBy(ob => ob.rentFee + ob.topupFee);
    }

    if (source === 'all' && category === 'income') {
        return fp.sumBy(ob => ob.rent + ob.topup);
    }

    if (source === 'final' && !fp.isUndefined(category)) {
        return fp.sumBy(category);
    }

    const sourceMap = {
        topup: fp.sumBy('topup'),
        rent: fp.sumBy('rent'),
        final: fp.sumBy(ob => ob.finalReceive - ob.finalPay),
    };
    return fp.getOr(fp.sumBy('balance'))(`[${source}]`)(sourceMap);
};

const groupLocationIdInMonths = (year, reduceCondition) => (res) => {
    const itemMaps = fp.groupBy('id')(res);
    const allMonths = fp.map(
        m => ({[`${year}-${fp.padCharsStart('0')(2)(m)}`]: '-'}))(
        fp.range(1)(13));
    const valueTransform = fp.pipe(fp.groupBy('month'),
        fp.mapValues(fp.pipe(reduceCondition, fp.parseInt(10))),
        fp.defaults(fp.extendAll(allMonths)));

    return fp.map(entry => {
        const firstLocation = fp.head(itemMaps[fp.head(entry)]);
        return fp.defaults(fp.pick(['id', 'name'])(firstLocation))(
            {months: fp.last(entry)});
    })(fp.toPairs(fp.mapValues(valueTransform)(itemMaps)));
};

const groupChannelByTimespan = (timespan, reduceCondition) => (res) => {
    const allFundChannelIds = fp.map('fundChannelId')(
        fp.uniqBy('fundChannelId')(res));
    const fillUp = fp.map(id => ({[id]: 0}))(allFundChannelIds);
    const valueTransform = fp.pipe(fp.groupBy('fundChannelId'),
        fp.mapValues(fp.pipe(reduceCondition, fp.parseInt(10))),
        fp.defaults(fp.extendAll(fillUp)));

    return fp.sortBy('timespan')(fp.map(([k, v]) =>
        ({timespan: k, channels: v, total: fp.sum(fp.values(v))})
    )(fp.entries(fp.mapValues(valueTransform)(fp.groupBy('timespan')(res))))).
        reverse();
};
module.exports = {
    get: async (req, res) => {
        const BillPayment = MySQL.BillPayment;
        const Bills = MySQL.Bills;
        const Auth = MySQL.Auth;
        const Flows = MySQL.Flows;
        const Topup = MySQL.Topup;
        const BillFlows = MySQL.BillFlows;
        const notRequired = {required: false};
        const contractFilter = includeContracts(MySQL, notRequired);

        const projectId = req.params.projectId;
        const {
            source, category, locationIds,
            housesInLocation, houseFormat, districtId,
            from, to, view, year, timespan, index: pageIndex, size: pageSize,
        } = req.query;

        if (to < from) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: 'please provide valid from / to timestamp.'}));
        }

        if (view && !fp.includes(view)(['category', 'month', 'channel'])) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: `unrecognised view mode: ${view}`}));
        }

        if (source && !fp.includes(source)(['rent', 'all', 'final', 'topup'])) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: `unrecognised source : ${source}`}));
        }

        if (category &&
            !fp.includes(category)(['finalPay', 'income', 'fee', 'balance'])) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: `unrecognised category : ${source}`}));
        }

        if (timespan && !fp.includes(timespan)(['month', 'day'])) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: `unrecognised timespan : ${timespan}`}));
        }

        if (!(from && to) && view === 'channel') {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: 'please provide valid from / to timestamp for channel view.'}));
        }

        const locationCondition = locationIds ?
            '  and l.id in (:locationIds) ' : '';
        const districtCondition = districtId ?
            generateDivisionCondition(districtId) :
            '';
        const houseFormatCondition = houseFormat ?
            ' and h.houseFormat=:houseFormat ' :
            '';

        const groupByCategory = async (req, res) => {
            const sequelize = MySQL.Sequelize;
            const sql = housesInLocation ?
                groupHousesByLocationId(from, to,
                    [` and buildings.locationId = ${housesInLocation}`])
                : groupByLocationIds(from, to, [
                    locationCondition,
                    districtCondition, houseFormatCondition]);
            const replacements = fp.extendAll([
                {
                    projectId,
                    locationIds: fp.split(',')(locationIds),
                }, from && to ?
                    {
                        from: formatMysqlDateTime(from),
                        to: formatMysqlDateTime(to),
                    } : {},
                districtCondition ?
                    {
                        districtId,
                        parentDivisionId: ParentDivision(districtId) + '%',
                    } : {},
                houseFormatCondition ? {houseFormat} : {},
            ]);
            return sequelize.query(sql, {
                replacements,
                type: sequelize.QueryTypes.SELECT,
            }).
                then(flows => res.send(flows)).
                catch(err => res.send(500,
                    ErrorCode.ack(ErrorCode.DATABASEEXEC,
                        {error: err.message})));
        };

        const groupByMonth = async (req, res) => {
            const sequelize = MySQL.Sequelize;
            const reduceCondition = reduceByParams(source, category);

            const sql = housesInLocation ?
                groupHousesMonthlyByLocationId(
                    [` and buildings.locationId = ${housesInLocation}`])
                : groupMonthByLocationIds(year, [
                    locationCondition,
                    districtCondition, houseFormatCondition]);
            const replacements = fp.extendAll([
                {
                    projectId,
                    locationIds: fp.split(',')(locationIds),
                    from: formatMysqlDateTime(moment(`${year}-01-01`).unix()),
                    to: formatMysqlDateTime(moment(`${year}-12-31`).unix()),
                },
                districtCondition ?
                    {
                        districtId,
                        parentDivisionId: ParentDivision(districtId) + '%',
                    } : {},
                houseFormatCondition ? {houseFormat} : {},
            ]);
            return sequelize.query(sql, {
                replacements,
                type: sequelize.QueryTypes.SELECT,
            }).
                then(groupLocationIdInMonths(year, reduceCondition)).
                then(flows => res.send(flows)).
                catch(err => res.send(500,
                    ErrorCode.ack(ErrorCode.DATABASEEXEC,
                        {error: err.message})));
        };

        const groupByChannel = async (req, res) => {
            const sequelize = MySQL.Sequelize;
            const reduceCondition = reduceByParams(source, category);

            const sql = groupChannelByLocationIds(timespan, [
                locationCondition,
                districtCondition, houseFormatCondition]);
            const replacements = fp.extendAll([
                {
                    projectId,
                    locationIds: fp.split(',')(locationIds),
                    from: formatMysqlDateTime(from),
                    to: formatMysqlDateTime(to),
                },
                districtCondition ?
                    {
                        districtId,
                        parentDivisionId: ParentDivision(districtId) + '%',
                    } : {},
                houseFormatCondition ? {houseFormat} : {},
            ]);
            return sequelize.query(sql, {
                replacements,
                type: sequelize.QueryTypes.SELECT,
            }).
                then(groupChannelByTimespan(timespan, reduceCondition)).
                then(flows => res.send(flows)).
                catch(err => res.send(500,
                    ErrorCode.ack(ErrorCode.DATABASEEXEC,
                        {error: err.message})));
        };

        const normalFlow = async () => {
            const pagingInfo = Util.PagingInfo(pageIndex, pageSize, true);
            //TODO: in cash case, the operator is the manager, otherwise it's user themselves
            const operatorConnection = {
                model: Auth,
                attributes: ['id', 'username'],
            };

            const locationConditionOf = (query) => {
                const condition = districtLocation(query);
                const billKey = fp.replace(/^\$/)(
                    '$billpayment.bill.contract.room.house.')(
                    fp.head(fp.keys(condition)));
                const topupKey = fp.replace(/^\$/)(
                    '$topup.contract.room.house.')(fp.head(fp.keys(condition)));
                return condition ? {
                    $or: [
                        {[billKey]: fp.head(fp.values(condition))},
                        {[topupKey]: fp.head(fp.values(condition))},
                    ],
                } : {};
            };
            const flowOption = {
                include: [
                    {
                        model: BillPayment,
                        required: false,
                        include: [
                            {
                                model: Bills,
                                include: [
                                    contractFilter(houseFormat, {}), {
                                        model: BillFlows,
                                        as: 'billItems',
                                        attributes: [
                                            'configId',
                                            'amount',
                                            'createdAt',
                                            'id'],
                                    }, fundFlowConnection(MySQL)()],
                                attributes: ['id', 'type'],
                            }, operatorConnection],
                    }, {
                        model: Topup,
                        required: false,
                        include: [
                            contractFilter(houseFormat, {}), fp.merge({
                                as: 'operatorInfo',
                            }, operatorConnection)],
                    },
                ],
                where: fp.extendAll([
                    {
                        projectId,
                    }, from && to ? {
                        createdAt: {
                            $gte: formatMysqlDateTime(from),
                            $lte: formatMysqlDateTime(to),
                        },
                    } : {},
                    locationConditionOf(req.query),
                ]),
                distinct: true,
                offset: pagingInfo.skip,
                limit: pagingInfo.size,
                order: [
                    ['createdAt', 'DESC'],
                ],
                subQuery: false,
            };

            return Flows.findAndCountAll(flowOption).
                then(models => translate(models, pagingInfo)).
                then(flows => res.send(flows)).
                catch(err => res.send(500,
                    ErrorCode.ack(ErrorCode.DATABASEEXEC,
                        {error: err.message})));
        };

        if (view === 'category') {
            return groupByCategory(req, res);
        }

        if (view === 'month' && !year) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: 'please provide a valid year parameter, eg. year=2018'}));
        }

        if (year && view === 'month') {
            return groupByMonth(req, res);
        }

        if (from && to && view === 'channel') {
            return groupByChannel(req, res);
        }

        return normalFlow();
    },
};