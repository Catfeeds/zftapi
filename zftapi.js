require('include-node');
const appRootPath = require('app-root-path');
const Restify = require('restify');
const config = require('config');

require(appRootPath.path + '/libs/log')("zftAPI");

{
    global.ENV = require('process').env;
    global.Typedef = Include('/libs/typedef');
    global.MySQL = Include('/libs/mysql');
    global.MongoDB = Include('/libs/mongodb');
    global.Util = Include('/libs/util');
    global.ErrorCode = Include('/libs/errorCode');
    global.Amap = Include('/libs/amap');
    global.SnowFlake = Include('/libs/snowflake').Alloc(1, 1);
    global.GUID = Include('/libs/guid');
}

let Server = Restify.createServer();

Server.use(Restify.plugins.bodyParser());
Server.use(Restify.plugins.queryParser());

Include('/libs/enumServices').Load(
    Server,
    ['/services']
);

MongoDB(config.MONGODB).then(
	() => {
		MySQL.LoadEM().then(
			() => {
				Server.listen(8000, function () {
					console.log('App running on %s:%d', Server.address().address, Server.address().port);
				});
			});

	});
