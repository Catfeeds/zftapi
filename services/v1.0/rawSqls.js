'use strict';
const fp = require('lodash/fp');
const {IsParentDivision} = require('../../libs/util');

const billPaymentSqlLogic = conditions => '  sum(case\n' +
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
    '  and b2.id = b.billId\n' +
    '  and c.id = b2.contractId\n' +
    '  and b.projectId = :projectId \n' +
    '  and c.roomId = r.id\n' +
    '  and r.houseId = h.id\n' +
    '  and h.buildingId = buildings.id\n' +
    '  and buildings.locationId = l.id\n' + fp.join('\n')(conditions);

const topupSqlLogic = conditions => '  0 as rentPart,\n' +
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
    '  and c.id = t.contractId\n' +
    '  and t.projectId = :projectId \n' +
    '  and c.roomId = r.id\n' +
    '  and r.houseId = h.id\n' +
    '  and h.buildingId = buildings.id\n' +
    '  and buildings.locationId = l.id\n' + fp.join('\n')(conditions);

const groupByLocationIds = (from, to, conditions) => {
    const billPaymentFlow = 'select l.id, l.name,\n' +
        billPaymentSqlLogic(
            fp.compact(fp.concat([
                from && to ?
                    '  and f.createdAt > :from  and f.createdAt < :to \n' :
                    ''], conditions))) +
        'GROUP BY l.id, l.name\n';

    const topupFlow = 'select l.id, l.name,\n' +
        topupSqlLogic(
            fp.compact(fp.concat([
                from && to ?
                    '  and f.createdAt > :from  and f.createdAt < :to \n' :
                    ''], conditions))) +
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

const groupMonthByLocationIds = (year, conditions) => {
    const topupFlow = 'select l.id, l.name, ' +
        '  DATE_FORMAT(f.createdAt, \'%Y-%m\') as month,\n' +
        topupSqlLogic(
            fp.compact(fp.concat(['  and f.createdAt > :from  and f.createdAt < :to \n'],
                conditions))) +
        'GROUP BY l.id, l.name, month\n';

    const billPaymentFlow = 'select l.id, l.name, ' +
        '  DATE_FORMAT(f.createdAt, \'%Y-%m\') as month, \n' +
        billPaymentSqlLogic(
            fp.compact(fp.concat(['  and f.createdAt > :from  and f.createdAt < :to \n'],
                conditions))) +
        'GROUP BY l.id, l.name, month\n';

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

const groupChannelByLocationIds = (timespan='month', conditions) => {
    const timeformat = timespan === 'month' ? '%Y-%m' : '%Y-%m-%d';
    const topupFlow = 'select t.fundChannelId, ' +
        `  DATE_FORMAT(f.createdAt, '${timeformat}') as timespan,\n` +
        topupSqlLogic(
            fp.compact(fp.concat(['  and f.createdAt > :from  and f.createdAt < :to \n'],
                conditions))) +
        'GROUP BY t.fundChannelId, timespan\n';

    const billPaymentFlow = 'select b.fundChannelId, ' +
        `  DATE_FORMAT(f.createdAt, '${timeformat}') as timespan, \n` +
        billPaymentSqlLogic(
            fp.compact(fp.concat(['  and f.createdAt > :from  and f.createdAt < :to \n'],
                conditions))) +
        'GROUP BY b.fundChannelId, timespan\n';

    return 'select\n' +
        '  fundChannelId, timespan,\n' +
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
        'GROUP BY fundChannelId, timespan';
};

const groupHousesByLocationId = (from, to, locationCondition) => {
    return 'select id,\n' +
        '  sum(rentPart) as rent,\n' +
        '  sum(rentPartFee) as rentFee,\n' +
        '  sum(topupPart) as topup,\n' +
        '  sum(topupFeePart) as topupFee,\n' +
        '  sum(finalPayPart) as finalPay, \n' +
        '  sum(finalReceivePart) as finalReceive, \n' +
        '  (select sum(rentPart) - sum(rentPartFee) + sum(topupPart) - sum(topupFeePart) - sum(finalPayPart) + sum(finalReceivePart)) as balance ' +
        ' from (' +
        'select h.id,\n' +
        billPaymentSqlLogic(fp.compact(fp.concat([
            from && to ?
                '  and f.createdAt > :from  and f.createdAt < :to \n' :
                ''], locationCondition))) +
        ' GROUP BY h.id\n' +
        ' UNION\n' +
        'select h.id,\n' +
        topupSqlLogic(fp.compact(fp.concat([
            from && to ?
                '  and f.createdAt > :from  and f.createdAt < :to \n' :
                ''], locationCondition))) +
        ' GROUP BY h.id\n' +
        '     ) as f2\n' +
        ' GROUP BY id';
};

const groupHousesMonthlyByLocationId = locationCondition => {
    return 'select id,\n' +
        '  month,' +
        '  sum(rentPart) as rent,\n' +
        '  sum(rentPartFee) as rentFee,\n' +
        '  sum(topupPart) as topup,\n' +
        '  sum(topupFeePart) as topupFee,\n' +
        '  sum(finalPayPart) as finalPay, \n' +
        '  sum(finalReceivePart) as finalReceive, \n' +
        '  (select sum(rentPart) - sum(rentPartFee) + sum(topupPart) - sum(topupFeePart) - sum(finalPayPart) + sum(finalReceivePart)) as balance ' +
        ' from (' +
        'select h.id,\n' +
        '  DATE_FORMAT(f.createdAt, \'%Y-%m\') month,' +
        billPaymentSqlLogic(
            fp.compact(fp.concat(['  and f.createdAt > :from  and f.createdAt < :to \n'],
                locationCondition))) +
        ' GROUP BY h.id, month\n' +
        ' UNION\n' +
        'select h.id,\n' +
        '  DATE_FORMAT(f.createdAt, \'%Y-%m\') month,' +
        topupSqlLogic(
            fp.compact(fp.concat(['  and f.createdAt > :from  and f.createdAt < :to \n'],
                locationCondition))) +
        ' GROUP BY h.id, month\n' +
        '     ) as f2\n' +
        ' GROUP BY id, month';
};

const generateDivisionCondition = districtId => IsParentDivision(districtId) ?
    ' and l.divisionId like :parentDivisionId '
    : ' and l.divisionId=:districtId ';

module.exports = {
    groupHousesByLocationId,
    groupByLocationIds,
    groupMonthByLocationIds,
    groupHousesMonthlyByLocationId,
    generateDivisionCondition,
    groupChannelByLocationIds,
};