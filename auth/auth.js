'use strict';
const fp = require('lodash/fp');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const {assignNewId} = require('../services/v1.0/common');

const authenticate = (req, res, next) => {
    const platform = req.body.platform;
    const deviceId = req.body.deviceId;
    passport.authenticate('local', function(err, user) {
        if (err) {
            req.session.destroy();
            return res.json(ErrorCode.ack(ErrorCode.AUTHFAILED,
                {error: 'Incorrect username or password.'}));
        }
        console.info(`${JSON.stringify(user)} is authenticated.`);
        req.logIn(user, function(err) {
            if (err) {
                req.session.destroy();
                return next(err);
            }

            if (user.username) {
                bind(user, platform, deviceId).then(bind =>
                    bind ? res.json(ErrorCode.ack(ErrorCode.OK,
                        {success: `Binding ${user.username} successfully: ${bind.id}!`}))
                        : res.json(ErrorCode.ack(ErrorCode.OK,
                            {success: 'Welcome ' + user.username + '!'})));
            }
        });
    })(req, res, next);
};

const bind = async (user, platform, deviceId) => {
    if (!platform || !deviceId) return;
    const Bindings = MySQL.Bindings;
    return Bindings.findOrCreate({
        where: {authId: user.id},
        defaults: assignNewId({platform, deviceId, authId: user.id}),
    }).then(fp.head).then(bind => bind.updateAttributes({platform, deviceId}));
};
const logOut = (req, res) => {
    req.session.destroy();
    res.json(ErrorCode.ack(ErrorCode.OK, {success: 'Logged out successfully'}));
};

const guard = (req, res, next) => {
    if (fp.includes(req.url)(
        ['/v1.0/login', '/v1.0/healthCheck', '/v1.0/onCharge'])) {
        return next();
    }

    if (!req.isAuthenticated()) {
        return res.send(401);
    }

    const hasProjectId = /\/projects\/(\d+)/;
    //assume non project resources are public
    if (!hasProjectId.test(req.url)) {
        return next();
    }

    const belongsToThisProject = fp.getOr(-1)('user.projectId')(req).
        toString() === fp.get('[1]')(hasProjectId.exec(req.url)).toString();
    if (belongsToThisProject) {
        return next();
    }

    return res.send(401);
};

const lookUpUser = (username, password, done) => {
    const Auth = MySQL.Auth;
    Auth.findOne({
        where: {
            username,
        },
    }).then(user => {
        if (user.password.toLowerCase() === password.toLowerCase()) {
            return done(null, {
                username,
                id: user.id,
                projectId: user.projectId,
                level: user.level,
            });
        }
        done(new Error('Incorrect username or password.'));
    }).catch(
        (err) => {
            done(err, false, {error: 'Incorrect username or password.'});
        },
    );
};

const serialize = (user, done) => {
    done(null, user.id);
};
const deserialize = (id, done) => {
    const Auth = MySQL.Auth;
    Auth.findById(id).then(user => {
        done(null, {
            username: user.username,
            id,
            projectId: user.projectId,
            level: user.level,
        });
        return null;
    }).catch(err => {
        console.error(`error in deserializing ${err}`);
        done(null, null, {message: 'User does not exist'});
    });
};

const init = () => {
    passport.use(new LocalStrategy(lookUpUser));

    passport.serializeUser(serialize);

    passport.deserializeUser(deserialize);
};

module.exports = {
    authenticate,
    guard,
    init,
    logOut,
};