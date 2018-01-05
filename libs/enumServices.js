const appRootPath = require('app-root-path');
const _ = require('underscore');
const fs = require('fs');
const path = require('path');

exports = module.exports = function(){};

function LoadMethod(file)
{
    let methodSet = {};
    try {
        let importFile = require(file);
        _.map(importFile, (func, method)=>{
            methodSet[method] = func;
        });
    }
    catch(e){
        log.error(file, 'load error', e);
    }

    return methodSet;
}
function MethodMapping(server, methodMapping, url, methodSet) {
    _.map(methodSet, (func, method)=>{
        method = methodMapping[method];
        if(!method){
            return;
        }
        log.debug(method, ' ==> ', url);
        server[method](url, func);
    });
}

function Load(server, apiPath) {
    //枚举api接口的所有url

    let rootPath = path.join(appRootPath.path, apiPath);

    let TraversePath = function(basePath)
    {
        const avaliableExtName = ['.js'];

        let files;
        try{
            files = fs.readdirSync(basePath);
        }
        catch(e){
            log.error('Error: ', e);
            return;
        }

        if(!files){
            return;
        }

        files.map(basename=>{
            let newSubPath = path.join(basePath, basename);
            let extName = path.extname(basename);

            //判断文件是否可用于加载
            let fsStat = fs.lstatSync(newSubPath);
            if(!fsStat.isDirectory() && !_.contains(avaliableExtName, extName)){
                return;
            }

            if(fsStat.isDirectory()){
                //path
                TraversePath(newSubPath);
            }
            else if(extName === '.js'){
                //file
                let relativePath = path.relative(rootPath, basePath);
                relativePath = relativePath.replace('/handlers', '');
                relativePath = path.join(relativePath, basename.replace('.js', ''));

                let file = path.join(basePath, basename);

                const methodMapping = {
                    'delete': 'del',
                    'get': 'get',
                    'post': 'post',
                    'put': 'put',
                    'patch': 'patch'
                };

                const methods = LoadMethod(file);
                MethodMapping(server, methodMapping, relativePath, methods);
            }
        });
    };

    TraversePath(rootPath);
}

exports.Load = function (server, pathArray) {
    _.each(pathArray, function (apiPath) {
        Load(server, apiPath);
    });
};