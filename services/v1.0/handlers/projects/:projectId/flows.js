'use strict';

const fp = require('lodash/fp');
const moment = require('moment');
const {
    innerValues, omitSingleNulls, formatMysqlDateTime,
    includeContracts, singleRoomTranslate,
} = require(
    '../../../common');

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
    const allMonths = fp.map(m => ({[`${year}-${fp.padCharsStart('0')(2)(m)}`]: []}))(fp.range(1)(13));
    return fp.defaults(fp.extendAll(allMonths))(fp.groupBy('month')(res));
};

const groupByLocationId = (from, to, locationCondition) => {
    const billPaymentFlow = 'select l.id, l.name,\n' +
        '  sum(case\n' +
        '      when f.category=\'rent\' then f.amount else 0\n' +
        '      end) as rentPart,\n' +
        '  sum(case\n' +
        '      when f.category=\'rent\' then fee else 0\n' +
        '      end) as rentPartFee,\n' +
        '  0 as topupPart,\n' +
        '  0 as topupFeePart,\n' +
        '  sum(case\n' +
        '      when (f.category=\'final\' and f.direction=\'pay\') then f.amount else 0\n' +
        '      end) as finalPayPart, \n' +
        '  sum(case\n' +
        '      when (f.category=\'final\' and f.direction=\'receive\') then f.amount else 0\n' +
        '      end) as finalReceivePart\n' +
        'from\n' +
        '  billpayment b,\n' +
        '  bills b2,\n' +
        '  flows f,\n' +
        '  contracts c,\n' +
        '  houses h,\n' +
        '  rooms r,\n' +
        '  location l,\n' +
        '  buildings\n' +
        'where\n' +
        '  f.id = b.flowId\n' +
        (from && to ?
            '  and f.createdAt > :from  and f.createdAt < :to \n' :
            '') +
        '  and b2.id = b.billId\n' +
        '  and c.id = b2.contractId\n' +
        '  and b.projectId = :projectId \n' +
        '  and c.roomId = r.id\n' +
        '  and r.houseId = h.id\n' +
        '  and h.buildingId = buildings.id\n' +
        '  and buildings.locationId = l.id\n' +
        locationCondition +
        'GROUP BY l.id, l.name\n';

    const topupFlow = 'select l.id, l.name,\n' +
        '  0 as rentPart,\n' +
        '  0 as rentPartFee,\n' +
        '  sum(case\n' +
        '      when f.category=\'topup\' then f.amount else 0\n' +
        '      end) as topupPart,\n' +
        '  sum(case\n' +
        '      when f.category=\'topup\' then fee else 0\n' +
        '      end) as topupPartFee,\n' +
        '  0 as finalPayPart, \n' +
        '  0 as finalReceivePart \n' +
        'from\n' +
        '  topup t,\n' +
        '  flows f,\n' +
        '  contracts c,\n' +
        '  houses h,\n' +
        '  rooms r,\n' +
        '  location l,\n' +
        '  buildings\n' +
        'where\n' +
        '  f.id = t.flowId\n' +
        (from && to ?
            '  and f.createdAt > :from  and f.createdAt < :to \n' :
            '') +
        '  and c.id = t.contractId\n' +
        '  and t.projectId = :projectId \n' +
        '  and c.roomId = r.id\n' +
        '  and r.houseId = h.id\n' +
        '  and h.buildingId = buildings.id\n' +
        '  and buildings.locationId = l.id\n' +
        locationCondition +
        'GROUP BY l.id, l.name\n';

    return 'select\n' +
        '  id, name,\n' +
        '  sum(rentPart) as rent,\n' +
        '  sum(rentPartFee) as rentFee,\n' +
        '  sum(topupPart) as topup,\n' +
        '  sum(topupFeePart) as topupFee,\n' +
        '  sum(finalPayPart) as finalPay, \n' +
        '  sum(finalReceivePart) as finalReceive, \n' +
        '  (select sum(rentPart) - sum(rentPartFee) + sum(topupPart) - sum(topupFeePart) - sum(finalPayPart) + sum(finalReceivePart)) as balance ' +
        ' from (' +
        billPaymentFlow +
        ' UNION\n' +
        topupFlow +
        '     ) as f2\n' +
        'GROUP BY id, name';
};

const groupMonthByLocationId = (year, locationCondition) => {
    const billPaymentFlow = 'select l.id, l.name, ' +
        '  DATE_FORMAT(f.createdAt, \'%Y-%m\') as month, \n' +
        '  sum(case\n' +
        '      when f.category=\'rent\' then f.amount else 0\n' +
        '      end) as rentPart,\n' +
        '  sum(case\n' +
        '      when f.category=\'rent\' then fee else 0\n' +
        '      end) as rentPartFee,\n' +
        '  0 as topupPart,\n' +
        '  0 as topupFeePart,\n' +
        '  sum(case\n' +
        '      when (f.category=\'final\' and f.direction=\'pay\') then f.amount else 0\n' +
        '      end) as finalPayPart, \n' +
        '  sum(case\n' +
        '      when (f.category=\'final\' and f.direction=\'receive\') then f.amount else 0\n' +
        '      end) as finalReceivePart\n' +
        'from\n' +
        '  billpayment b,\n' +
        '  bills b2,\n' +
        '  flows f,\n' +
        '  contracts c,\n' +
        '  houses h,\n' +
        '  rooms r,\n' +
        '  location l,\n' +
        '  buildings\n' +
        'where\n' +
        '  f.id = b.flowId\n' +
        '  and f.createdAt > :from  and f.createdAt < :to \n' +
        '  and b2.id = b.billId\n' +
        '  and c.id = b2.contractId\n' +
        '  and b.projectId = :projectId \n' +
        '  and c.roomId = r.id\n' +
        '  and r.houseId = h.id\n' +
        '  and h.buildingId = buildings.id\n' +
        '  and buildings.locationId = l.id\n' +
        locationCondition +
        'GROUP BY l.id, l.name, DATE_FORMAT(createdAt, \'%Y-%m\')\n';

    const topupFlow = 'select l.id, l.name, ' +
        '  DATE_FORMAT(f.createdAt, \'%Y-%m\') as month,\n' +
        '  0 as rentPart,\n' +
        '  0 as rentPartFee,\n' +
        '  sum(case\n' +
        '      when f.category=\'topup\' then f.amount else 0\n' +
        '      end) as topupPart,\n' +
        '  sum(case\n' +
        '      when f.category=\'topup\' then fee else 0\n' +
        '      end) as topupPartFee,\n' +
        '  0 as finalPayPart, \n' +
        '  0 as finalReceivePart \n' +
        'from\n' +
        '  topup t,\n' +
        '  flows f,\n' +
        '  contracts c,\n' +
        '  houses h,\n' +
        '  rooms r,\n' +
        '  location l,\n' +
        '  buildings\n' +
        'where\n' +
        '  f.id = t.flowId\n' +
        '  and f.createdAt > :from  and f.createdAt < :to \n' +
        '  and c.id = t.contractId\n' +
        '  and t.projectId = :projectId \n' +
        '  and c.roomId = r.id\n' +
        '  and r.houseId = h.id\n' +
        '  and h.buildingId = buildings.id\n' +
        '  and buildings.locationId = l.id\n' +
        locationCondition +
        'GROUP BY l.id, l.name, DATE_FORMAT(f.createdAt, \'%Y-%m\')\n';

    return 'select\n' +
        '  id, name, month,\n' +
        '  sum(rentPart) as rent,\n' +
        '  sum(rentPartFee) as rentFee,\n' +
        '  sum(topupPart) as topup,\n' +
        '  sum(topupFeePart) as topupFee,\n' +
        '  sum(finalPayPart) as finalPay, \n' +
        '  sum(finalReceivePart) as finalReceive, \n' +
        '  (select sum(rentPart) - sum(rentPartFee) + sum(topupPart) - sum(topupFeePart) - sum(finalPayPart) + sum(finalReceivePart)) as balance ' +
        ' from (' +
        billPaymentFlow +
        ' UNION\n' +
        topupFlow +
        '     ) as f2\n' +
        'GROUP BY id, name, month';
};

const housesGroupByLocationId = (from, to, locationCondition) => {
    return 'select\n' +
        '  id, \n' +
        '  sum(rentPart) as rent,\n' +
        '  sum(rentPartFee) as rentFee,\n' +
        '  sum(topupPart) as topup,\n' +
        '  sum(topupFeePart) as topupFee,\n' +
        '  sum(finalPayPart) as finalPay, \n' +
        '  sum(finalReceivePart) as finalReceive, \n' +
        '  (select sum(rentPart) - sum(rentPartFee) + sum(topupPart) - sum(topupFeePart) - sum(finalPayPart) + sum(finalReceivePart)) as balance ' +
        ' from (select h.id,\n' +
        '  sum(case\n' +
        '      when f.category=\'rent\' then f.amount else 0\n' +
        '      end) as rentPart,\n' +
        '  sum(case\n' +
        '      when f.category=\'rent\' then fee else 0\n' +
        '      end) as rentPartFee,\n' +
        '  0 as topupPart,\n' +
        '  0 as topupFeePart,\n' +
        '  sum(case\n' +
        '      when (f.category=\'final\' and f.direction=\'pay\') then f.amount else 0\n' +
        '      end) as finalPayPart, \n' +
        '  sum(case\n' +
        '      when (f.category=\'final\' and f.direction=\'receive\') then f.amount else 0\n' +
        '      end) as finalReceivePart\n' +
        'from\n' +
        '  billpayment b,\n' +
        '  bills b2,\n' +
        '  flows f,\n' +
        '  contracts c,\n' +
        '  rooms r,\n' +
        '  houses h,\n' +
        '  buildings\n' +
        ' where\n' +
        '  f.id = b.flowId\n' +
        (from && to ?
            '  and f.createdAt > :from  and f.createdAt < :to \n' :
            '') +
        '  and b2.id = b.billId\n' +
        '  and c.id = b2.contractId\n' +
        '  and b.projectId = :projectId \n' +
        '  and c.roomId = r.id\n' +
        '  and r.houseId = h.id\n' +
        '  and h.buildingId = buildings.id\n' +
        locationCondition +
        ' GROUP BY h.id\n' +
        ' UNION\n' +
        'select h.id,\n' +
        '  0 as rentPart,\n' +
        '  0 as rentPartFee,\n' +
        '  sum(case\n' +
        '      when f.category=\'topup\' then f.amount else 0\n' +
        '      end) as topupPart,\n' +
        '  sum(case\n' +
        '      when f.category=\'topup\' then fee else 0\n' +
        '      end) as topupPartFee,\n' +
        '  0 as finalPayPart, \n' +
        '  0 as finalReceivePart \n' +
        'from\n' +
        '  topup t,\n' +
        '  flows f,\n' +
        '  contracts c,\n' +
        '  houses h,\n' +
        '  rooms r,\n' +
        '  buildings\n' +
        ' where\n' +
        '  f.id = t.flowId\n' +
        (from && to ?
            '  and f.createdAt > :from  and f.createdAt < :to \n' :
            '') +
        '  and c.id = t.contractId\n' +
        '  and t.projectId = :projectId \n' +
        '  and c.roomId = r.id\n' +
        '  and r.houseId = h.id\n' +
        '  and h.buildingId = buildings.id\n' +
        locationCondition +
        ' GROUP BY h.id\n' +
        '     ) as f2\n' +
        ' GROUP BY id';
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
                :
                groupByLocationId(from, to, locationCondition);
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