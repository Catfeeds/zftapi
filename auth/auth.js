'use strict';
const _ = require('lodash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const authenticate = (req, res, next) => {
	passport.authenticate("local", function (err, user, info) {
		console.log(`${user} is authentic.`);
		req.logIn(user, function (err) {
			if (err) {
				return next(err);
			}

			if (user.username) {
				res.json({success: 'Welcome ' + user.username + "!"});
				return next();
			}
		});
	})(req, res, next);
};

const guard = (req, res, next) => {
	if (_.includes(['/v1.0/login', '/v1.0/healthCheck'], req.url)) {
		return next();
	}
	console.log('authenticated? ', req.isAuthenticated());
	return req.isAuthenticated() ? next() : res.send(401);
};

const lookUpUser = (username, password, done) => {
	console.log('done', username);
	return done(null, {username, id: 123});
};

const serialize = (user, done) => {
	done(null, user.id);
};
const deserialize = (id, done) => {
	done(null, {username: 'kpse', id});
};


const init = () => {
	passport.use(new LocalStrategy(lookUpUser));

	passport.serializeUser(serialize);

	passport.deserializeUser(deserialize);
}

module.exports = {
	authenticate,
	guard,
	init
}