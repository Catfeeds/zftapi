require('include-node');
const appRootPath = require('app-root-path');
const Restify = require('restify');
require(appRootPath.path + '/libs/log')("EMAPI");

{
    global.Typedef = Include('/libs/typedef');
    global.MySQL = Include('/libs/mysql');
    global.Util = Include('/libs/util');
    global.ErrorCode = Include('/libs/errorCode');
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
        Server.listen(8000, function () {
            console.log('App running on %s:%d', Server.address().address, Server.address().port);
        });
    }
);
