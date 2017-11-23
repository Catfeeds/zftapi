const Q = require('q');
const _  = require('underscore');
const Sequelize = require('sequelize');
const moment = require('moment');
const UUID = require('uuid');
const config = require('config');

let connection;
let pool;
let sequelizeInstance;

exports = module.exports = function(host, port, user, passwd, database, isReadOnly){
};

exports.Literal = (str)=>{
    return sequelizeInstance.literal(str);
};

exports.Load = function () {

    return new Promise((resolve, reject)=>{
        sequelizeInstance = new Sequelize(null, null, null, {
            dialect: 'mysql',
            replication:{
				read: [config.RDS],
				write: config.RDS
            },
            logging: false,
            timezone: "+08:00",
            retry:{
                max: 0
            },
            pool:{
                maxConnections: 20,
                minConnections: 5,
                maxIdleTime: 1000
            }
        });
        sequelizeInstance.authenticate().then(
            function (err) {
                log.info('RDS Connection Successful...');
                resolve();

                exports.Sequelize = sequelizeInstance;

                SequelizeDefine();
            }
        ).catch(function (err) {
            log.error(err);
            reject(err);
        });
    });
};

exports.Exec = function(sql)
{
    //
    if(!sql || !sql.length){
        return null;
    }

    //判断QueryTypes
    var queryTypes;
    {
        var blankIndex = sql.indexOf(" ");
        var types = sql.substr(0, blankIndex);
        switch(types){
            case "SELECT":
            case "select":
                queryTypes = Sequelize.QueryTypes.SELECT;
                break;
            case "UPDATE":
            case "update":
                queryTypes = Sequelize.QueryTypes.UPDATE;
                break;
            case "DELETE":
            case "delete":
                queryTypes = Sequelize.QueryTypes.DELETE;
                break;
            case "INSERT":
            case "insert":
                queryTypes = Sequelize.QueryTypes.INSERT;
                break;
            default:
                return null;
                break;
        }
    }

    var deferred = Q.defer();

    sequelizeInstance.query(sql, { type: queryTypes}).then(
        function (result) {
            deferred.resolve(result);
        }, function (err) {
            log.error(err, sql);
            deferred.resolve();
        }
    );

    return deferred.promise;
};

exports.ExecT = function(sql, t)
{
    //
    if(!sql || !sql.length){
        return null;
    }

    //判断QueryTypes
    var queryTypes;
    {
        var blankIndex = sql.indexOf(" ");
        var types = sql.substr(0, blankIndex);
        switch(types){
            case "SELECT":
            case "select":
                queryTypes = Sequelize.QueryTypes.SELECT;
                break;
            case "UPDATE":
            case "update":
                queryTypes = Sequelize.QueryTypes.UPDATE;
                break;
            case "DELETE":
            case "delete":
                queryTypes = Sequelize.QueryTypes.DELETE;
                break;
            case "INSERT":
            case "insert":
                queryTypes = Sequelize.QueryTypes.INSERT;
                break;
            default:
                return null;
                break;
        }
    }

    return sequelizeInstance.query(sql, { type: queryTypes, transaction: t});
};

function SequelizeDefine()
{
    exports.Houses = sequelizeInstance.define('houses', {
        hid: {
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true
        },
        projectid: {
            type: Sequelize.STRING(64),  //项目ID
            allowNull: false,
            defaultValue: ''
        },
        code: {
            type: Sequelize.STRING(10),  //编号
            defaultValue: '',
            allowNull: false
        },
        format: {
            type: Sequelize.BOOLEAN // 房源类型
            , allowNull: false
            , defaultValue: 0
        },
        city: {
            type: Sequelize.INTEGER // 城市
            , allowNull: false
            , defaultValue: 0
        },
        community: {
            type: Sequelize.STRING(20)  //小区名称
            , allowNull: false
            , defaultValue: ''
        },
        address: {
            type: Sequelize.STRING(128) // 地址
            , allowNull: false
            , defaultValue: ''
        },
        group: {
            type: Sequelize.STRING(10)  //团组名称(一期/香桂苑)
            , allowNull: false
            , defaultValue: ''
        },
        building: {
            type: Sequelize.STRING(10)  //门牌号
            , allowNull: false
            , defaultValue: ''
        },
        unit: {
            type: Sequelize.STRING(10)  //单元
            , allowNull: false
            , defaultValue: ''
        },
        roomnumber: {
            type: Sequelize.STRING(10)  //房号
            , allowNull: false
            , defaultValue: ''
        },
        desc: {
            type: Sequelize.STRING(255) // 介绍
            , allowNull: false
            , defaultValue: ''
        },
        area: {
            type: Sequelize.BOOLEAN // 面积
            , allowNull: false
            , defaultValue: 0
        },
        nfloor: {
            type: Sequelize.BOOLEAN // 所在层
            , allowNull: false
            , defaultValue: 0
        },
        tfloor: {
            type: Sequelize.BOOLEAN // 总层高
            , allowNull: false
            , defaultValue: 0
        },
        rifloor: {
            type: Sequelize.BOOLEAN // 每层房间数
            , allowNull: false
            , defaultValue: 0
        },
        timecreate: {
            type: Sequelize.BIGINT.UNSIGNED // 创建时间
            , allowNull: false
            , defaultValue: 0
        },
        timedelete: {
            type: Sequelize.BIGINT.UNSIGNED // 删除时间
            , allowNull: false
            , defaultValue: 0
        },
        status: {
            type: Sequelize.BOOLEAN  //房源状态
            , allowNull: false
            , defaultValue: 0
        }
    }, {
        timestamps: false,
        freezeTableName: true
    });

    //房间
    exports.Rooms = sequelizeInstance.define('rooms', {
        roomid:{
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true,
            allowNull: false
        },
        hid: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false
        },
        name: {
            type: Sequelize.STRING(10),
            allowNull: false,
            defaultValue: ''
        },
        roomtype: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        area: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        orientation: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        status: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        }
    },{
        timestamps: false,
        freezeTableName: true
    });

    //
    exports.HouseType = sequelizeInstance.define('housetype', {
        htid:{
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true,
            allowNull: false
        },
        hid: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false
        },
        name: {
            type: Sequelize.STRING(10),
            allowNull: false,
            defaultValue: ''
        },
        room: {
            type: Sequelize.BOOLEAN,  // 室
            allowNull: false,
            defaultValue: 0
        },
        hall: {
            type: Sequelize.BOOLEAN,  // 厅
            allowNull: false,
            defaultValue: 0
        },
        toilet: {
            type: Sequelize.BOOLEAN,  // 卫
            allowNull: false,
            defaultValue: 0
        },
        orientation: {
            type: Sequelize.BOOLEAN,  // 朝向
            allowNull: false,
            defaultValue: 0
        },
        area: {
            type: Sequelize.BOOLEAN,  // 面积
            allowNull: false,
            defaultValue: 0
        },
        remark:{
            type: Sequelize.STRING(255),
            allowNull: false,
            defaultValue: ''
        }
    },{
        timestamps: false,
        freezeTableName: true
    });

    exports.Setting = sequelizeInstance.define('setting', {
        cfgid: {
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        projectid: {
            type: Sequelize.STRING(64),  //项目ID
            allowNull: false,
            defaultValue: '*'
        },
        group: {
            type: Sequelize.STRING(10),  //分组名
            allowNull: false,
            defaultValue: ''
        },
        key: {
            type: Sequelize.STRING(10),  //名称
            allowNull: false,
            defaultValue: ''
        },
        value: {
            type: Sequelize.STRING(10),  //值
            allowNull: false,
            defaultValue: ''
        },
    },{
        timestamps: false,
        freezeTableName: true
    });


    exports.Contracts = sequelizeInstance.define('contracts', {
        contractid: {
            type: Sequelize.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        hrid: {
            type: Sequelize.BIGINT.UNSIGNED,     //房源ID
            allowNull: false,
            defaultValue: 0
        },
        uid: {
            type: Sequelize.BIGINT.UNSIGNED,     //用户ID
            allowNull: false,
            defaultValue: 0
        },
        from: {
            type: Sequelize.BIGINT.UNSIGNED,     //起租时间
            allowNull: false,
            defaultValue: 0
        },
        to: {
            type: Sequelize.BIGINT.UNSIGNED,     //到期时间
            allowNull: false,
            defaultValue: 0
        },
        strategy: {
            type: Sequelize.TEXT,   //付款方式
            get: function(){
                let strategy;
                try{
                    strategy = JSON.parse(this.getDataValue('strategy'));
                }
                catch(e){
                    strategy = {};
                }
                return strategy;
            },
            set : function (value) {
                this.setDataValue('strategy', JSON.stringify(value));
            }
        },
        expenses: {
            type: Sequelize.TEXT,   //加收费用
            get: function(){
                let expenses;
                try{
                    expenses = JSON.parse(this.getDataValue('expenses'));
                }
                catch(e){
                    expenses = {};
                }
                return expenses;
            },
            set : function (value) {
                this.setDataValue('expenses', JSON.stringify(value));
            }
        },
        paytime: {
            type: Sequelize.STRING(3),      //支付时间 (账单提前-02/账单固定+02/账单前一个月固定F03)
            allowNull: false
        },
        signtime: {
            type: Sequelize.BIGINT.UNSIGNED,    //签约时间
            allowNull: false,
            defaultValue: 0
        }
    },{
        timestamps: false,
        freezeTableName: true
    });

    exports.Bills = sequelizeInstance.define('bills', {
        billid: {
            type: Sequelize.BIGINT.UNSIGNED,    //
            allowNull: false,
            defaultValue: 0
        },
        flow: { //资金流向(收入/支出)
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        entity: { //实体类型(租客/业主/房源/其他)
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        relativeID: {   //类型关联ID(租客/业主=>UDI,房源=>contractid)
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            defaultValue: 0
        },
        projectid: {    //项目ID
            type: Sequelize.STRING(64),
            allowNull: false
        },
        source: {   //来源
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        type: {   //账单类型(expenseid)
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: 0
        },
        billfrom: {
            type: Sequelize.BIGINT.UNSIGNED,    //开始账期
            allowNull: false,
            defaultValue: 0
        },
        billto: {
            type: Sequelize.BIGINT.UNSIGNED,    //结束账期
            allowNull: false,
            defaultValue: 0
        },
        paytime: {
            type: Sequelize.BIGINT.UNSIGNED,    //支付日期
            allowNull: false,
            defaultValue: 0
        },
        amount: {   //金额 扩大100
            type: Sequelize.BIGINT.UNSIGNED
        },
        submitter: {
            type: Sequelize.BIGINT.UNSIGNED,    //提交人
            allowNull: false,
            defaultValue: 0
        },
        operator: {
            type: Sequelize.BIGINT.UNSIGNED,    //经办人
            allowNull: false,
            defaultValue: 0
        },
        timecreate: {
            type: Sequelize.BIGINT.UNSIGNED,    //创建时间
            allowNull: false,
            defaultValue: 0
        },
        remark: {   //备注
            type: Sequelize.STRING(255),
            defaultValue: ''
        },
        metadata: {
            type: Sequelize.TEXT,   //对象信息（批次等）
            get: function(){
                let metadata;
                try{
                    metadata = JSON.parse(this.getDataValue('metadata'));
                }
                catch(e){
                    metadata = {};
                }
                return metadata;
            },
            set : function (value) {
                this.setDataValue('metadata', JSON.stringify(value));
            }
        }
    },{
        timestamps: false,
        freezeTableName: true
    });

    exports.BillFlows = sequelizeInstance.define('billflows', {
        flowid: {
            type: Sequelize.BIGINT.UNSIGNED,    //
            allowNull: false,
            defaultValue: 0
        },
        billid: {
            type: Sequelize.BIGINT.UNSIGNED,    // 账单ID
            allowNull: false,
            defaultValue: 0
        },
        projectid: {
            type: Sequelize.STRING(64),  //项目ID
            allowNull: false,
            defaultValue: ''
        },
        category: {
            type: Sequelize.BOOLEAN,    //
            allowNull: false,
            defaultValue: 0
        },
        relevantid: {
            type: Sequelize.STRING(64),  //根据来源相关的ID
            allowNull: false,
            defaultValue: ''
        },
        amount: {
            type: Sequelize.BIGINT.UNSIGNED,    //金额 扩大100
            allowNull: false,
            defaultValue: 0
        },
        paychannel: {
            type: Sequelize.BIGINT.UNSIGNED,    // 支付渠道
            allowNull: false,
            defaultValue: 0
        },
        operator: {
            type: Sequelize.BIGINT.UNSIGNED,    // 经办人
            allowNull: false,
            defaultValue: 0
        },
        flowfrom: {
            type: Sequelize.BIGINT.UNSIGNED,    // 流水起始
            allowNull: false,
            defaultValue: 0
        },
        flowto: {
            type: Sequelize.BIGINT.UNSIGNED,    // 流水截止
            allowNull: false,
            defaultValue: 0
        },
        timecreate: {
            type: Sequelize.BIGINT.UNSIGNED,    // 创建时间
            allowNull: false,
            defaultValue: 0
        },
        timedelete: {
            type: Sequelize.BIGINT.UNSIGNED,    // 删除时间
            allowNull: false,
            defaultValue: 0
        },
        status: {
            type: Sequelize.BOOLEAN,    //状态
            allowNull: false,
            defaultValue: 0
        }
    },{
        timestamps: false,
        freezeTableName: true
    });

    exports.BillFlows = sequelizeInstance.define('billflows', {
        flowid: {
            type: Sequelize.BIGINT.UNSIGNED,    //
            allowNull: false,
            defaultValue: 0
        },
        billid: {
            type: Sequelize.BIGINT.UNSIGNED,    // 账单ID
            allowNull: false,
            defaultValue: 0
        },
        projectid: {
            type: Sequelize.STRING(64),  //项目ID
            allowNull: false,
            defaultValue: ''
        },
        category: {
            type: Sequelize.BOOLEAN,    //
            allowNull: false,
            defaultValue: 0
        },
        relevantid: {
            type: Sequelize.STRING(64),  //根据来源相关的ID
            allowNull: false,
            defaultValue: ''
        },
        amount: {
            type: Sequelize.BIGINT.UNSIGNED,    //金额 扩大100
            allowNull: false,
            defaultValue: 0
        },
        paychannel: {
            type: Sequelize.BIGINT.UNSIGNED,    // 支付渠道
            allowNull: false,
            defaultValue: 0
        },
        operator: {
            type: Sequelize.BIGINT.UNSIGNED,    // 经办人
            allowNull: false,
            defaultValue: 0
        },
        flowfrom: {
            type: Sequelize.BIGINT.UNSIGNED,    // 流水起始
            allowNull: false,
            defaultValue: 0
        },
        flowto: {
            type: Sequelize.BIGINT.UNSIGNED,    // 流水截止
            allowNull: false,
            defaultValue: 0
        },
        timecreate: {
            type: Sequelize.BIGINT.UNSIGNED,    // 创建时间
            allowNull: false,
            defaultValue: 0
        },
        timedelete: {
            type: Sequelize.BIGINT.UNSIGNED,    // 删除时间
            allowNull: false,
            defaultValue: 0
        },
        status: {
            type: Sequelize.BOOLEAN,    //状态
            allowNull: false,
            defaultValue: 0
        }
    },{
        timestamps: false,
        freezeTableName: true
    });
}


exports.GenerateFundID = function(uid)
{
    var now = moment();
    var timePrefix = now.format('YYYYMMDDHHmmss');   //14位时间
    var suffix = UUID.v4(uid+timePrefix).replace(/-/g, '');

    return timePrefix + suffix;
};

//获取数据表名称
exports.DataCollectionName = function (time)
{
    return "daily" + time.format("YYYYMM");
};
//获取计费日志表名称
exports.PaymentTableName = function (time)
{
    return "paymentlog"+ time.format("YYYYMM");
};

/*
 * 数组转换成 SQL 语句 IN 适用的
 * */
exports.GenerateSQLInArray = function(array)
{
    var idsArray = [];
    _.each(array, function (id) {
        idsArray.push("'"+id+"'");
    });
    return idsArray.toString();
};

/*
 * 组成SQL语句
 * */
exports.GenerateSQL = function(sql, queryArray)
{
    var sqlSentence = sql;
    if(queryArray.length){

        sqlSentence += " WHERE ";
        _.each(queryArray, function (query, index) {
            if(index){
                sqlSentence += " AND ";
            }
            sqlSentence += query;
        });
    }

    return sqlSentence;
};

/*
* 获取纯数据
* */
exports.Plain = function (data)
{
    return data.get({plain: true})
};

/*
* 获取能耗表
* */
exports.EnergyConsumptionTable = function(time)
{
    return "ecdaily"+time.format('YYYYMM');
};
/*
* 获取原始能耗
* */
exports.OriginEnergyConsumptionTable = function (time) {
    return "origindaily"+time.format('YYYYMM');
};
/*
 * 获取费用表
 * */
exports.CostTable = function(time)
{
    return "costdaily"+time.format('YYYYMM');
};

class Paging{
    constructor(area){
        this.area = area;
    }

    calc(paging){
        let lowerbound = (paging.pageindex-1) * paging.pagesize;
        let upperbound = lowerbound + paging.pagesize;
        let _this = this;
        let areaPaging = [];

        let i = 0;
        for(;i<_this.area.length;i++){
            let item = _this.area[i];
            const v = item.count;
            const k = item.key;

            upperbound -= v;
            if(lowerbound < v){
                const left = v - lowerbound;
                console.info(k, lowerbound, left);
                areaPaging.push({
                    key: k,
                    offset: lowerbound,
                    limit: left
                });
                if(left >= paging.pagesize){
                    return;
                }
                break;
            }
            lowerbound -= v;
        }
        i++;

        for(;i< _this.area.length&&upperbound;i++){
            let item = _this.area[i];
            const v = item.count;
            const k = item.key;
            if(upperbound < v){
                console.info(k, 0, upperbound);
                areaPaging.push({
                    key: k,
                    offset: 0,
                    limit: upperbound
                });
                break;
            }
            upperbound -= v;
            console.info(k, 0, v);
            areaPaging.push({
                key: k,
                offset: 0,
                limit: v
            });
        }

        return areaPaging;
    }
}

exports.QueryFundDetails = (fields, timeFrom, timeTo, where, paging, groupby, orderby)=>{
    return new Promise((resolve, reject)=>{
        //
        let tablename = (time)=>{
            return `funddetails${time.format('YYYYMM')}`;
        };

        if(!timeFrom.isValid() || !timeTo.isValid() ){
            return reject(ErrorCode.ack(ErrorCode.TIMETYPEERROR));
        }

        if(_.isArray(fields)){
            fields = fields.toString();
        }

        //paging info
        if(!paging || !paging.pageindex || !paging.pagesize ){
            return reject(ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        //get time
        if(!_.isArray(where)){
            return reject(ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        where.push(`timecreate between ${timeFrom.unix()} AND ${timeTo.unix()}`);


        let buildQuery = (tablePaging)=>{
            let queryArray = [];
            tablePaging.map(p=>{
                let sql = `select ${fields} from ${tablePaging.key} `;
                sql = MySQL.GenerateSQL(sql, where);
                if(groupby){
                    sql += ` group by ${groupby}`;
                }
                if(orderby){
                    sql += ` order by ${orderby} `;
                }
                sql += ` limit ${p.offset},${p.limit}`;
                log.info(sql);
                queryArray.push(MySQL.Exec(sql));
            });
            return queryArray;
        };
        let process = (allQuery)=>{
            Promise.all(allQuery).then(
                records=>{
                    let data = [];
                    records.map(rec=>{
                        rec.map(r=>{
                            data.push(r);
                        });
                    });

                    resolve(data);
                },err=>{
                    log.error(err);
                }

            );
        };
        if(timeFrom.format('YYYYMM') != timeTo.format('YYYYMM')){
            //跨表
            const tableA = tablename(timeFrom);
            const tableB = tablename(timeTo);
            const queryA = MySQL.GenerateSQL(`select count(id) as count from ${tableA}`, where);
            const queryB = MySQL.GenerateSQL(`select count(id) as count from ${tableB}`, where);

            Promise.all([
                MySQL.Exec(queryA),
                MySQL.Exec(queryB),
            ]).then(
                result=>{
                    let area = [
                        {key: tableA, count: result[0][0].count},
                        {key: tableA, count: result[0][0].count},
                    ];

                    let pagingObj = new Paging(area);
                    let areaSeg = pagingObj.calc(paging);

                    process( buildQuery(areaSeg) );
                }
            );
        }
        else{
            //未跨表
            let areaSeg = [
                {key: `funddetails${timeFrom.format('YYYYMM')}`, offset: paging.pageindex, limit: paging.pagesize}
            ];

            process( buildQuery(areaSeg) );
        }
    });
};

exports.PERMINUTE = 'PERMINUTE';
exports.PERDAY = 'PERDAY';
exports.PERWEEK = 'PERWEEK';
exports.PERMONTH = 'PERMONTH';
exports.PERYEAR = 'PERYEAR';