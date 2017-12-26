'use strict';
const _ = require('lodash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const authenticate = (req, res, next) => {
	passport.authenticate("local", function (err, user, info) {
		console.log(`${user} is authenticated.`);
		req.logIn(user, function (err) {
			if (err) {
				req.session.destroy();
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
	const Users = MySQL.Users;
	const UserAuth = MySQL.UserAuth;
	Users.findOne({
		include: [{model: UserAuth, required: true}],
		where: {
			accountName: username
		}
	}).then(user => {
		if (user.userauth.dataValues.password === password) {
			done(null, {username, id: user.id});
		} else {
			done(null, false, {error: 'Incorrect username or password.'});
		}
	}).catch(
		(err) => done(null, false, {error: 'Incorrect username or password.'})
	);
};

const serialize = (user, done) => {
	console.log('serialize', user);
	done(null, user.id)
};
const deserialize = (id, done) => {
	console.log('deserialize', id);
	const Users = MySQL.Users;
	Users.findById(id)
		.then(user => {
			done(null, {username: user.dataValues.accountName, id});
		})
		.catch(err => {
			console.log(`error in deserializing ${user}`);
			done(err, null);
		});
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