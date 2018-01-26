const _ = require('lodash');

exports.ParameterCheck = function(parameter, checklist)
{
    if(!parameter || !checklist){
        log.error('parameter or checklist null');
        return false;
    }

    for(let i in checklist){
        let checkItem = checklist[i];
        if(checkItem.indexOf('|')){
            let checkItemList = checkItem.split('|');
            let isMatch = _.find(checkItemList, function (checkItem) {
                return parameter[checkItem] != null && parameter[checkItem] != undefined;
            });
            if(!isMatch){
                return false;
            }
        }
        else {
            if (parameter[checkItem] == null || parameter[checkItem] == undefined) {
                log.error(parameter, 'missed', checkItem);
                return false;
            }
        }
    }

    return true;
};

exports.TopDistrict = (districtCode)=>{
    if(districtCode.length % 2 !== 0){
        throw Error(ErrorCode.PARAMETERERROR);
    }

    const prefix = districtCode.length - 2;
    const prefixDistrict = districtCode.substr(0, prefix);
    if(districtCode.substr(prefix) !== '00'){
        return districtCode;
    }

    return exports.TopDistrict(prefixDistrict);
};

exports.ParentDivisionId = (divisionId)=>{
    return exports.ParentDivision(divisionId)+'00';
};
exports.ParentDivision = (divisionId)=>{
    return divisionId.substr(0,4);
};
exports.IsParentDivision = (divisionId)=>{
    const parentDivisionId = exports.ParentDivisionId(divisionId);
    return parentDivisionId === divisionId;
};


exports.PagingInfo = function(pageindex, pagesize, useDefault)
{
    if(!pageindex && !pagesize){
        if(!useDefault){
            return null;
        }
        pageindex = 1;
        pagesize = 10;
    }

    if(!pageindex){
        pageindex = 1;
    }
    if(!pagesize){
        pagesize = 10;
    }

    const skip = (pageindex-1)*pagesize;
    return {index: parseInt(pageindex), size: parseInt(pagesize), skip: parseInt(skip)};
};

async function Pay(userId, amount, t) {

    const MAX_LOCK = 4294967000;

    const cashAccount = await MySQL.CashAccount.findOne({
        where:{
            userId: userId
        }
    });

    if(!cashAccount){
        return ErrorCode.ack(ErrorCode.USERNOTEXISTS);
    }

    try {
        const result = await MySQL.CashAccount.update(
            {
                balance: MySQL.Literal(`balance+${amount}`),
                locker: cashAccount.locker > MAX_LOCK ? 1: MySQL.Literal(`locker+1`)
            },
            _.assign({
                where: {
                    userId: userId,
                    locker: cashAccount.locker
                }
            }, t ? {transaction: t} : {})
        );
        if(!result || !result[0]){
            //save failed
            throw new Error(ErrorCode.LOCKDUMPLICATE);
        }
    }
    catch(err){
        log.error('pay error', userId, amount, err);

        if(err.message === ErrorCode.LOCKDUMPLICATE.toString()){
            return ErrorCode.ack(ErrorCode.LOCKDUMPLICATE);
        }
        else {
            return ErrorCode.ack(ErrorCode.DATABASEEXEC);
        }
    }

    return ErrorCode.ack(ErrorCode.OK, {balance: cashAccount.balance + amount, amount: amount, userId: userId});
}

exports.PayWithOwed = async(userId, amount, t)=>{

    let count = 4;
    let ret;
    do {
        ret = await Pay(userId, amount, t);
    }while(count-- && ret.code !== ErrorCode.OK);

    return ret;
};

exports.charge = async(fundChannel, amount, orderNo, subject, body, metaData)=>{
    async function pingppExtra(channel, userId) {
        switch (channel.tag){
            case 'wx':
            case 'wx_pub': {
                try {
                    const wxUser = await MySQL.WXUser.findOne({
                        where: {
                            userId: userId
                        }
                    });

                    return {
                        open_id: wxUser.openId
                    }
                }
                catch(e){
                    log.error(e, channel, userId);
                }

            }
                break;
            default:
                return {};
        }
    }

    if(!fundChannel.setting || !fundChannel.setting.appid || !fundChannel.setting.key) {
        return false;
    }

    //online
    const pingXX = require('pingpp')(fundChannel.setting.key);

    const chargesObj = {
        amount: amount,
        order_no: orderNo,
        channel: fundChannel.tag,
        client_ip: "127.0.0.1",
        subject: subject,
        body: body,
        currency: 'cny',
        app: {
            id: fundChannel.setting.appid
        },
        // extra: await pingppExtra(fundChannel.tag, userId),
        metadata: metaData
    };
    return await pingXX.charges.create(chargesObj);
};