require('include-node');
const appRootPath = require('app-root-path');
const Restify = require('restify');
require(appRootPath.path + '/libs/log')("zftAPI");

{
    global.ENV = require('process').env;
    global.Typedef = Include('/libs/typedef');
    global.MySQL = Include('/libs/mysql');
    global.Util = Include('/libs/util');
    global.ErrorCode = Include('/libs/errorCode');
    global.Amap = Include('/libs/amap');
    global.SnowFlake = Include('/libs/snowflake').Alloc(1, 1);
}

let Server = Restify.createServer();

Server.use(Restify.plugins.bodyParser());
Server.use(Restify.plugins.queryParser());

Include('/libs/enumServices').Load(
    Server,
    ['/services']
);

MySQL.Load().then(
    resolve=>{
        MySQL.Houses.sync({alter: true});
        MySQL.Rooms.sync({alter: true});

        MySQL.HouseType.sync({alter: true});
        MySQL.Setting.sync({alter: true});
        MySQL.Contracts.sync({alter: true});
        MySQL.Users.sync({alter: true});
        MySQL.GeoLocation.sync({alter: true});
        MySQL.Bills.sync({alter: true});
        MySQL.BillFlows.sync({alter: true});

        Server.listen(8000, function () {
            console.log('App running on %s:%d', Server.address().address, Server.address().port);
        });
    }
);
