/*
* 全局常量定义
* */
const config = require('config');
const moment = require('moment');
const _ = require('underscore');
const validator = require('validator');

module.exports = exports = function(){};

const HouseStatus = {
    CLOSED: 'CLOSED',
    OPEN: 'OPEN',
    DELETE: 'DELETE'
};
const HouseFormat = {
    SHARE: 'SHARE',
    SOLE: 'SOLE',
    ENTIRE: 'ENTIRE'
};
const HouseFormatLiteral = {
    [HouseFormat.SHARE]: {
        name: '合租'
    },
    [HouseFormat.SOLE]: {
        name: '整租'
    },
    [HouseFormat.ENTIRE]: {
        name: '独幢'
    }
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
const RoomStatus = {
    IDLE: 0,
    INUSE: 1,
    NEWFORCONF: 2,
    SURRENDERCONF: 3,
    CLOSED: 4
};
const RoomStatusLiteral = {
    [RoomStatus.IDLE]: '待租',
    [RoomStatus.INUSE]: '已租',
    [RoomStatus.NEWFORCONF]: '新收配置',
    [RoomStatus.SURRENDERCONF]: '退租配置',
    [RoomStatus.CLOSED]: '关闭',
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

const IsHouseFormat = (status)=>{
    return HouseFormat[status];
};
const IsRoomType = (index)=>{
    return RoomType.length > index && index >= 0;
};
const IsOrientation = (ori)=>{
    return Orientation[ori];
};

exports.HouseStatus = HouseStatus;
exports.HouseFormat = HouseFormat;
exports.HouseFormatLiteral = HouseFormatLiteral;
exports.RoomStatus = RoomStatus;
exports.RoomStatusLiteral = RoomStatusLiteral;
exports.Orientation = Orientation;
exports.OrientationLiteral = OrientationLiteral;
exports.RoomType = RoomType;

exports.IsHouseFormat = IsHouseFormat;
exports.IsRoomType = IsRoomType;
exports.IsOrientation = IsOrientation;