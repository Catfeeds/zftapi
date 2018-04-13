require('include-node');
const appRootPath = require('app-root-path');
const Restify = require('restify');
const passport = require('passport');
const sessions = require('client-sessions');
const auth = require('./auth/auth');
const {job: cronJob} = require('./libs/cronJob');

require(appRootPath.path + '/libs/log')('zftAPI');

{
    global.ENV = require('process').env;
    global.Typedef = Include('/libs/typedef');
    global.MySQL = Include('/libs/mysql');
    global.Util = Include('/libs/util');
    global.ErrorCode = Include('/libs/errorCode');
    global.Amap = Include('/libs/amap');
    global.SnowFlake = Include('/libs/snowflake').alloc(1, 1);
    global.GUID = Include('/libs/guid');
    global.Message = Include('/libs/message');
    global.Notifications = Include('/libs/notifications');
}

let Server = Restify.createServer();

Server.use(Restify.plugins.bodyParser());
Server.use(Restify.plugins.queryParser());
Server.use(
    function crossOrigin(req, res, next) {
        res.header('Access-Control-Allow-Origin', 'https://saas.51dianxiaoge.com');
        res.header('Access-Control-Allow-Headers', 'Access-Control-Allow-Origin, Access-Control-Allow-Headers, Origin, X-Requested-With, Content-Type, CORRELATION_ID');
        res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, PATCH, OPTIONS');
        res.header('Access-Control-Allow-Credentials', 'true');
        return next();
    },
);
Server.opts(/.*/, (req, res) => res.send(204));

Server.use(sessions({
    // cookie name dictates the key name added to the request object
    cookieName: 'session',
    // should be a large unguessable string
    secret: 'zftisanawesomeproduct',
    // how long the session will stay valid in ms
    duration: 30 * 24 * 60 * 60 * 1000
}));

Server.use(passport.initialize());
Server.use(passport.session());

auth.init();

Server.use(auth.guard);

Include('/libs/enumServices').Load(
    Server,
    ['/services']
);

MySQL.Load().then(
    () => {
        cronJob();
        Include('/libs/moduleLoader');

        Server.listen(8000, function () {
            console.log('App running on %s:%d', Server.address().address, Server.address().port);
        });
    });
