const _ = require('underscore');

exports.ParameterCheck = function(parameter, checklist)
{
    if(!parameter || !checklist){
        log.error('parameter or checklist null');
        return false;
    }

    for(let i in checklist){
        let checkItem = checklist[i];
        if(checkItem.indexOf('|')){
            let checkItemList = checkItem.split('|');
            let isMatch = _.find(checkItemList, function (checkItem) {
                return parameter[checkItem] != null && parameter[checkItem] != undefined;
            });
            if(!isMatch){
                return false;
            }
        }
        else {
            if (parameter[checkItem] == null || parameter[checkItem] == undefined) {
                log.error(parameter, 'missed', checkItem);
                return false;
            }
        }
    }

    return true;
};