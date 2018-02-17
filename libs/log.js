const appRootPath = require('app-root-path');
const config = require('config');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

exports = module.exports = function(appName, logPath)
{
    logPath = logPath || 'log';
    let loggerPath = path.join(appRootPath.path, logPath);
    if(!fs.existsSync(loggerPath)){
        fs.mkdirSync(loggerPath);
    }

    const methods = ['tracer', 'warn', 'info', 'error', 'debug',  'response', 'request', 'delete'];
    if(config.logfile) {
        const os = require('os');
        global.log = require('tracer').dailyfile({
            root: logPath,
            logPathFormat: '{{root}}/{{prefix}}_{{date}}.log',
            methods: methods,
            allLogsFileName: appName+"_"+os.hostname(),
            format: "[{{timestamp}}] {{ipAddress}}:{{pid}} {{appName}} {{title}} {{path}}{{relativePath}}:{{line}}:{{method}} {{message}}",
            dateformat: "yyyy-mm-dd HH:MM:ss",
            maxLogFiles:365,
            preprocess: function (data) {
                const process = require('process');
                const ip = require("ip");

                data.relativePath = path.relative(appRootPath.path, data.path);
                data.path = '';
                data.title = data.title.toUpperCase();
                data.pid = process.pid;
                data.ipAddress = ip.address();
                data.appName = appName;

                _.each(data.args, function (v, i) {
                    if(_.isObject(v)){
                        data.args[i] = JSON.stringify(v);
                    }
                });
            }
        });
    }
    else{
        global.log = require('tracer').console({
            methods: methods
        });
    }
};