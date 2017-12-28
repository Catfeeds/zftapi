'use strict';
const _ = require('lodash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const authenticate = (req, res, next) => {
	passport.authenticate("local", function (err, user) {
		if(err) {
			req.session.destroy();
			return res.json(ErrorCode.ack(ErrorCode. AUTHFAILED, {error: 'Incorrect username or password.'}));
		}
		console.log(`${user} is authenticated.`);
		req.logIn(user, function (err) {
			if (err) {
				req.session.destroy();
				return next(err);
			}

			if (user.username) {
				res.json(ErrorCode.ack(ErrorCode.OK, {success: 'Welcome ' + user.username + "!"}));
				return next();
			}
		});
	})(req, res, next);
};

const logOut = (req, res) => {
	req.session.destroy();
	res.json(ErrorCode.ack(ErrorCode.OK, {success: 'Logged out successfully'}));
}

const guard = (req, res, next) => {
	if (_.includes(['/v1.0/login', '/v1.0/healthCheck'], req.url)) {
		return next();
	}

	if(!req.isAuthenticated()) {
		return res.send(401);
	}

	const hasProjectId = /\/projects\/(\d+)/;
	//assume non project resources are public
	if (!hasProjectId.test(req.url)) {
		return next();
	}

	const belongsToThisProject = _.get(req, 'user.projectId', -1) === parseInt(_.get(hasProjectId.exec(req.url), '[1]'))
	if(belongsToThisProject) {
		return next();
	}

	return res.send(401);
};

const lookUpUser = (username, password, done) => {
	const Auth = MySQL.Auth;
	Auth.findOne({
		where: {
			username
		}
	}).then(user => {
		if (user.password.toLowerCase() === password.toLowerCase()) {
			return done(null, {username, id: user.id, projectId: user.projectId, level: user.level});
		}
		done(new Error('Incorrect username or password.'))
	}).catch(
		(err) => {
			done(err, false, {error: 'Incorrect username or password.'})
		}
	);
};

const serialize = (user, done) => {
	done(null, user.id)
};
const deserialize = (id, done) => {
	const Auth = MySQL.Auth;
	Auth.findById(id)
		.then(user => {
			done(null, {username: user.username, id, projectId: user.projectId, level: user.level})
			return null;
		})
		.catch(err => {
			console.log(`error in deserializing ${err}`);
			done(null, null, { message: 'User does not exist' });
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
	init,
	logOut
}