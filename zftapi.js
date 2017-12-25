require('include-node');
const appRootPath = require('app-root-path');
const Restify = require('restify');
const config = require('config');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const sessions = require("client-sessions");

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


Server.use(sessions({
	// cookie name dictates the key name added to the request object
	cookieName: 'session',
	// should be a large unguessable string
	secret: 'zftisanawesomeproduct',
	// how long the session will stay valid in ms
	duration: 2 * 24 * 60 * 60 * 1000
}));

Server.use(passport.initialize());
Server.use(passport.session());

passport.use(new LocalStrategy(
	function(username, password, done) {
		console.log('done', username);
		return done(null, {username, id: 123});
	}
));

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

// This is how a user gets deserialized
passport.deserializeUser(function(id, done) {
	return done(null, {username: 'kpse', id});
});

Server.post("/login", function(req, res, next) {
	passport.authenticate("local", function(err, user, info) {
		console.log(`${user} is authentic.`);
		req.logIn(user, function(err) {
			if (err) {
				return next(err);
			}
			console.log(req.isAuthenticated());
			console.log(req.user.id);
			// console.log(req.zftSession.userId = req.user.id);

			if(user.username) {
				res.json({ success: 'Welcome ' + user.username + "!"});
				return next();
			}

			return next();
		});


	})(req, res, next);
});

Server.use(function (req, res, next) {
	if (req.url === '/login') {
		return next();
	}
	console.log('authenticated? ', req.isAuthenticated());
	return req.isAuthenticated() ? next() : res.send(401);
});

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
