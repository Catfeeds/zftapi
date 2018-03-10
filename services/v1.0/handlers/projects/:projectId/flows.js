'use strict';

const fp = require('lodash/fp');
const moment = require('moment');
const {
    innerValues, omitSingleNulls, formatMysqlDateTime,
    includeContracts, singleRoomTranslate,
} = require(
    '../../../common');

const {
    groupByLocationId, groupMonthByLocationId, housesGroupByLocationId
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

const translate = (models, pagingInfo) => {
    const singleBillPayment = fp.pipe(innerValues, omitSingleNulls,
        formatRoom('bill.contract.room'),
        formatOperator('auth'), formatUser('bill.contract.user'),
        formatContract('bill.contract'), formatBillItems('bill.billItems'),
        formatFundChannelFlows('bill.fundChannelFlows'), omitFields);
    const singleTopUp = fp.pipe(innerValues, omitSingleNulls,
        formatRoom('contract.room'),
        formatUser('contract.user'), formatContract('contract'),
        formatOperator('operatorInfo'), formatTime('createdAt'), omitFields);

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

const groupResultByMonth = (year) => (res) => {
    const allMonths = fp.map(
        m => ({[`${year}-${fp.padCharsStart('0')(2)(m)}`]: []}))(
        fp.range(1)(13));
    return fp.defaults(fp.extendAll(allMonths))(fp.groupBy('month')(res));
};

module.exports = {
    get: async (req, res) => {
        const BillPayment = MySQL.BillPayment;
        const Bills = MySQL.Bills;
        const Auth = MySQL.Auth;
        const Flows = MySQL.Flows;
        const Topup = MySQL.Topup;
        const BillFlows = MySQL.BillFlows;
        const FundChannelFlows = MySQL.FundChannelFlows;
        const forceRequired = {required: false};
        const contractFilter = includeContracts(MySQL, forceRequired);

        const query = req.query;
        const projectId = req.params.projectId;
        const locationIds = fp.get('locationIds')(query);
        const housesInLocation = fp.get('housesInLocation')(query);
        const houseFormat = query.houseFormat;
        const from = query.from;
        const to = query.to;
        const view = query.view;
        const year = query.year;

        if (to < from) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: 'please provide valid from / to timestamp.'}));
        }

        const groupByCategory = async (req, res) => {
            const sequelize = MySQL.Sequelize;
            const locationCondition = (locationIds ?
                '  and l.id in (:locationIds)' :
                '');
            const sql = housesInLocation ?
                housesGroupByLocationId(from, to,
                    ` and buildings.locationId = ${housesInLocation}`)
                : groupByLocationId(from, to, locationCondition);
            const replacements = fp.defaults({projectId, locationIds})(
                from && to ?
                    {
                        from: formatMysqlDateTime(from),
                        to: formatMysqlDateTime(to),
                    } :
                    {});
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
            const locationCondition = (locationIds ?
                '  and l.id in (:locationIds)' :
                '');
            const sql = housesInLocation ?
                housesGroupByLocationId(from, to,
                    ` and buildings.locationId = ${housesInLocation}`)
                : groupMonthByLocationId(year, locationCondition);
            const replacements = fp.defaults({projectId, locationIds})({
                from: formatMysqlDateTime(moment(`${year}-01-01`).unix()),
                to: formatMysqlDateTime(moment(`${year}-12-31`).unix()),
            });
            return sequelize.query(sql, {
                replacements,
                type: sequelize.QueryTypes.SELECT,
            }).
                then(groupResultByMonth(year)).
                then(flows => res.send(flows)).
                catch(err => res.send(500,
                    ErrorCode.ack(ErrorCode.DATABASEEXEC,
                        {error: err.message})));
        };

        if (view === 'category') {
            return groupByCategory(req, res);
        }

        if (!year && view === 'month') {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR,
                {error: 'please provide a valid year parameter, eg. year=2018'}));
        }

        if (year && view === 'month') {
            return groupByMonth(req, res);
        }

        const pagingInfo = Util.PagingInfo(query.index, query.size, true);
        //TODO: in cash case, the operator is the manager, otherwise it's user themselves
        const operatorConnection = {
            model: Auth,
            attributes: ['id', 'username'],
        };
        const fundFlowConnection = {
            model: FundChannelFlows,
            required: false,
            attributes: ['id', 'category', 'orderNo', 'from', 'to', 'amount'],
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
                                }, fundFlowConnection],
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
            where: fp.merge({
                projectId,
            }, from && to ? {
                createdAt: {
                    $gte: formatMysqlDateTime(from),
                    $lte: formatMysqlDateTime(to),
                },
            } : {}),
            distinct: true,
            offset: pagingInfo.skip,
            limit: pagingInfo.size,
            order: [
                ['createdAt', 'DESC'],
            ],
        };
        return Flows.findAndCountAll(flowOption).
            then(models => translate(models, pagingInfo)).
            then(flows => res.send(flows)).
            catch(err => res.send(500,
                ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    },
};