const appRootPath = require('app-root-path');
const _ = require('underscore');
const fs = require('fs');
const path = require('path');

exports = module.exports = function(){};

function Load(server, apiPath) {
    //枚举api接口的所有url

    let rootPath = path.join(appRootPath.path, apiPath);

    let TraversePath = function(basePath)
    {
        const avaliableExtname = ['.js'];

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

        _.each(files, function(basename){
            //
            let newSubPath = path.join(basePath, basename);
            let extName = path.extname(basename);

            //判断文件是否可用于加载
            let fsStat = fs.lstatSync(newSubPath);
            if(!fsStat.isDirectory() && !_.contains(avaliableExtname, extName)){
                return;
            }

            if(fsStat.isDirectory()){
                //path
                TraversePath(newSubPath);
            }
            else if(extName == '.js'){
                //file
                let relativePath = path.relative(rootPath, basePath);
                if(relativePath.indexOf('handlers') != -1){
                    var i = 0;
                }


                relativePath = relativePath.replace('/handlers', '');
                relativePath = path.join(relativePath, basename.replace('.js', ''));

                let file = path.join(basePath, basename);

                const methodMapping = {
                    'delete': 'del',
                    'get': 'get',
                    'post': 'post',
                    'put': 'put'
                };

                try {
                    let importFile = require(file);
                    _.map(importFile, (func, method)=>{
                        // let url = path.join(apiPath, relativePath);
                        if(!methodMapping[method]){
                            return;
                        }
                        method = methodMapping[method];
                        log.debug(method, ' ==> ', relativePath);


                        // const version = relativePath.split('/')[0];
                        // const validatorPath = path.join('/services',  version, 'validateSchema');
                        //
                        // const validatorSchema = Include(validatorPath);
                        // const validatorHook = (req, res, next)=>{
                        //     const handler = func;
                        //     const body = req.body;
                        //
                        //     const key = relativePath.replace(version, '');
                        //     const result = validatorSchema.Validate(key, body);
                        //     if( result ){
                        //         res.status().send(result);
                        //     }
                        //
                        //     handler(req, res);
                        //     next();
                        // };
                        // server[method](relativePath, validatorHook);
                        server[method](relativePath, func);
                    });
                }
                catch(e){
                    log.error(file, 'load error', e);
                }
            }
        })
    };

    TraversePath(rootPath);
}

exports.Load = function (server, pathArray) {
    _.each(pathArray, function (apiPath) {
        Load(server, apiPath);
    });
};