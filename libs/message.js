const moment = require('moment');

const MessageType = {
    NTF_BALANCEINSUFFICIENT: 5300,  //余额不足
    NTF_ACCOUNTARREARS: 5301,       //账户欠费
    NTF_ARREARSSTOPSERVICES: 5303,  //停服断电
    NTF_ACCOUNTNEW: 5305,           //创建账户
    NTF_RENTBILL: 5400,             //房租账单
    NTF_BILLEXPIRED: 5401,          //账单过期
};

function send(messageTypeId, body){
    const obj = {
        id: SnowFlake.next(),
        timestamp: moment().unix(),
        messageTypeId: messageTypeId,
        param: body
    };
    MySQL.EventQueue.create(obj).then(
        ()=>{},
        err=>{
            log.error(err, messageTypeId, body, obj);
        }
    );
}

exports.createNewAccount = (projectId, userId, account, passwd)=>{
    send(MessageType.NTF_ACCOUNTNEW, {
        projectId: projectId,
        userId: userId,
        account: account,
        passwd: passwd
    });
};