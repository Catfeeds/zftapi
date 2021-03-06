/*
* 全局常量定义
* */

module.exports = exports = function(){};

const HouseFormat = {
    SHARE: 'SHARE',
    SOLE: 'SOLE',
    ENTIRE: 'ENTIRE'
};
const HouseFormatLiteral = {
    [HouseFormat.SHARE]: '合租',
    [HouseFormat.SOLE]: '整租',
    [HouseFormat.ENTIRE]: '独幢'
};

const RoomType = [
    '',
    '主卧',
    '次卧',
    '客卧',
    '床位',
    '主卧带卫',
    '小次卧',
    '东次卧',
    '西次卧',
    '南次卧',
    '北次卧',
    '客厅隔',
    '餐厅隔',
    '厨房隔',
];
const HouseStatus = {
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
    DELETED: 'DELETED'
};
const ContractStatus = {
    ONGOING: 'ONGOING',
    TERMINATED: 'TERMINATED'
};

const CredentialLevels = {
    MANAGER: 'MANAGER',
    ADMIN: 'ADMIN',
    ACCOUNTANT: 'ACCOUNTANT',
    USER: 'USER',
    OP: 'OP',
    UNKNOWN: 'UNKNOWN'
};
const OperationStatus = {
    IDLE: 'IDLE',
    INUSE: 'INUSE',
    PAUSED: 'PAUSED',
    DELETED: 'DELETED'
};
const OperationStatusLiteral = {
    [OperationStatus.IDLE]: '待租',
    [OperationStatus.INUSE]: '已租',
    [OperationStatus.PAUSED]: '暂停',
    [OperationStatus.DELETED]: '已删除',
};

const FundFlow = {
    RECEIVE: 'receive',
    PAY: 'pay'
};

const Orientation = {
    N: 'N',
    S: 'S',
    E: 'E',
    W: 'W',
    NW: 'NW',
    NE: 'NE',
    SE: 'SE',
    SW: 'SW',
};
const OrientationLiteral = {
    [Orientation.N]: '朝北',
    [Orientation.S]: '朝南',
    [Orientation.E]: '朝东',
    [Orientation.W]: '朝西',
    [Orientation.NW]: '西北',
    [Orientation.NE]: '东北',
    [Orientation.SE]: '东南',
    [Orientation.SW]: '西南',
};

const PriceType = {
    ELECTRIC: 'ELECTRIC'
};

const FundChannelCategory = {
    'ALL': 'all',
    'ONLINE': 'online',
    'OFFLINE': 'offline'
};
const FundChannelStatus = {
    'PASSED': 'PASSED',
    'PENDING': 'PENDING'
};

const DriverCommand = {
    'EMC_ON': 'EMC_ON',
    'EMC_OFF': 'EMC_OFF',
    'EMC_STATUS': 'EMC_STATUS',
    'EMC_SWITCH': 'EMC_SWITCH',
    'EMC_SYNC': 'EMC_SYNC',
    'EMC_ONLINE': 'EMC_ONLINE',
    'EMC_OFFLINE': 'EMC_OFFLINE'
};

const ServiceChargeType = {
    'TOPUP': 'TOPUP',
    'BILL': 'BILL'
};

const FundChannelFlowCategory = {
    TOPUP: 'TOPUP',
    BILL: 'BILL',
    SCTOPUP: 'SCTOPUP',
    COMMISSION: 'COMMISSION'
};

const WithDrawStatus = {
    PENDING: 'PENDING',
    AUDITFAILURE: 'AUDITFAILURE',
    PROCESSING: 'PROCESSING',
    PROCESSFAILURE: 'PROCESSFAILURE',
    DONE: 'DONE'
};

const PlatformId = 1;

const IsOrientation = (ori)=>{
    return Orientation[ori];
};

module.exports = {
    HouseFormat,
    HouseFormatLiteral,
    HouseStatus,
    OperationStatus,
    OperationStatusLiteral,
    Orientation,
    OrientationLiteral,
    RoomType,
    PriceType,
    IsOrientation,
    ContractStatus,
    CredentialLevels,
    FundFlow,
    FundChannelCategory,
    FundChannelStatus,
    DriverCommand,
    ServiceChargeType,
    FundChannelFlowCategory,
    PlatformId,
    WithDrawStatus
};
