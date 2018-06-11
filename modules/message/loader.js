const fs = require('fs');
const path = require('path');
const fp = require('lodash/fp');

exports.run = ()=>{
  const modulePath = __dirname;
  let files;

  try{
    files = fs.readdirSync(modulePath);
  }
  catch(e){
    log.error('Error: ', e);
  }

  const MODULENAME = 'Message';

  if(files){
    global.Message = {};
    fp.each(baseName => {
      //
      const newSubPath = path.join(modulePath, baseName);

      const stat = fs.lstatSync(newSubPath);
      if( !stat.isDirectory() ){
        return;
      }

      const subModulePath = path.join(newSubPath, path.basename(newSubPath));
      try {
        let handle = require(subModulePath);
        const moduleName = handle.moduleName;

        global.Message[moduleName] = handle.alloc();

        log.debug(moduleName, '==> ', MODULENAME, moduleName);
      }
      catch(e){
        log.error('message loader error', subModulePath, e);
      }
    })(files);
  }
};