const _ = require('lodash');
const fs = require('fs');
const path = require('path');

const baseDir = '/';
const modulePath = 'modules';

let files;

try{
    files = fs.readdirSync(modulePath);
}
catch(e){
    log.error('Error: ', e);
}

if(files){
    _.each(files, function(basename){
        //
        const loaderPath = path.join('/', modulePath, basename, 'loader');
        try {
            let handle = Include(loaderPath);
            handle.run();
        }
        catch(e){
            log.error('loader run error', loaderPath, e);
        }
    })
}