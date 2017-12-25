/*
* 全局常量定义
* */
const _ = require('lodash');
const validator = require('validator');

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
const OperationStatus = {
    IDLE: 'IDLE',
    INUSE: 'INUSE',
    NEWFORCONF: 'NEWFORCONF',
    SURRENDERCONF: 'SURRENDERCONF',
    CLOSED: 'CLOSED',
    DELETED: 'DELETED'
};
const OperationStatusLiteral = {
    [OperationStatus.IDLE]: '待租',
    [OperationStatus.INUSE]: '已租',
    [OperationStatus.NEWFORCONF]: '新收配置',
    [OperationStatus.SURRENDERCONF]: '退租配置',
    [OperationStatus.CLOSED]: '关闭',
};
const OperationReverseMapping = (status)=>{
    return _.find(OperationStatus, v=>{
        return v === status
    });
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

const IsHouseFormat = (status)=>{
    return HouseFormat[status];
};
const IsRoomType = (index)=>{
    return RoomType.length > index && index >= 0;
};
const IsOrientation = (ori)=>{
    return Orientation[ori];
};
const IsPriceType = (type)=>{
    return PriceType[type];
};

exports.HouseFormat = HouseFormat;
exports.HouseFormatLiteral = HouseFormatLiteral;
exports.HouseStatus = HouseStatus;
exports.OperationStatus = OperationStatus;
exports.OperationStatusLiteral = OperationStatusLiteral;
exports.Orientation = Orientation;
exports.OrientationLiteral = OrientationLiteral;
exports.RoomType = RoomType;

exports.PriceType = PriceType;

exports.IsHouseFormat = IsHouseFormat;
exports.IsRoomType = IsRoomType;
exports.IsOrientation = IsOrientation;
exports.IsPriceType = IsPriceType;