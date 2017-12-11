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

exports.ParentDivisionId = (divisionId)=>{
    return exports.ParentDivision(divisionId)+'00';
};
exports.ParentDivision = (divisionId)=>{
    return divisionId.substr(0,4);
};
exports.IsParentDivision = (divisionId)=>{
    const parentDivisionId = exports.ParentDivisionId(divisionId);
    return parentDivisionId === divisionId;
};


exports.PagingInfo = function(pageindex, pagesize, useDefault)
{
    if(!pageindex && !pagesize){
        if(!useDefault){
            return null;
        }
        pageindex = 1;
        pagesize = 10;
    }

    if(!pageindex){
        pageindex = 1;
    }
    if(!pagesize){
        pagesize = 10;
    }

    var skip = (pageindex-1)*pagesize;
    return {index: parseInt(pageindex), size: parseInt(pagesize), skip: parseInt(skip)};
};