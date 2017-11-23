/*
* 全局常量定义
* */
const config = require('config');
const moment = require('moment');
const _ = require('underscore');
const validator = require('validator');

module.exports = exports = function(){};

const HouseStatus = {
    CLOSED: 0,
    OPEN: 1,
    DELETE: 2
};
const HouseFormat = {
    JOINT: 0,
    ENTIRE: 1,
    SOLE: 2
};
const HouseFormatLiteral = {
    [HouseFormat.CLOSED]: {
        name: '合租'
    },
    [HouseFormat.OPEN]: {
        name: '整租'
    },
    [HouseFormat.DELETE]: {
        name: '独幢'
    }
};

const IsHouseFormat = (status)=>{
    return HouseFormat[status];
};

exports.HouseStatus =HouseStatus;
exports.HouseFormat = HouseFormat;
exports.HouseFormatLiteral = HouseFormatLiteral;
exports.isHouseFormat = IsHouseFormat;