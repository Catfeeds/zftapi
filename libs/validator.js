const validator = require('validator');
const _ =require('underscore');

const Rules = {
    '/houses': {
        oneOf:[
            ['a','b','c'],
        ],
        schemaSet: {
            'code.err': {
                required: true,
                schema: [
                    {
                        method: 'isLength',
                        options: {
                            min: 0,
                            max: 10
                        }
                    }
                ]
            }
        }
    }
};

class OneOf{
    constructor(rules){
        this.rules = rules;
        this.variableMapping = {};
    }
    fill(key){
        if(!this.variableMapping[key]){
            this.variableMapping[key] = 0;
        }
        this.variableMapping[key]++;
    }
    isMatch(){
        const _this = this;
        for(let i = 0;i < _this.rules.length; i++){
            const rule = _this.rules[i];
            let v = 0;
            rule.map(r=>{
                if( _this[r] !== undefined && _this[r] !== null ){
                    v++;
                }
            });

            if(!v){
                return rule;
            }
        }
        return null;
    }
}

class Validator{
    constructor(){
        this.rule = {};
    }

    /*
    * path: 'pathA/pathB/...pathN.variable'
    * rules: [
    *   {
    *       method: validator's method
    *       options: validator's options
    *       customer: self method
    *   }
    * ]
    * */
    create(path, rules) {
        //
        const ParsePath = (path) => {
            const pathPair = path.split('.');
            if (pathPair.length !== 2) {
                return false;
            }

            return {
                path: pathPair[0],
                variable: pathPair[1]
            };
        };


        // if(path === 'common'){
        //     return {
        //         path: 'common',
        //         variable: rules
        //     }
        // }
        // else{
        //     if (_.isObject(rules)) {
        //         rules = [rules];
        //     }
        // }

        // const pathObj = ParsePath(path);
        // if (!pathObj) {
        //     return pathObj;
        // }
        // if (this.rule[pathObj.path]) {
        //     return false;
        // }

        this.rule[path] = rules;
        return true;
    }

    run(path, data){
        const runner = (path, body)=>{

        };

        if(!data){
            return false;
        }

        const rule = this.rule[path];
        if(!rule){
            return false;
        }

        let oneOf = new OneOf(rule.oneOf);
        for(const key in rule.schemaSet){
            if(!body.hasOwnProperty(key)){
                continue;
            }

            let schema = rule.schemaSet[key];
            if(schema.required && (body[key] === null || body[key] === undefined)){
                return false;
            }

            oneOf.fill(key);

            const len = rules.length;
            for(let i=0; i<len; i++){
                const rule = rules[i];
                if(rule.customer) {
                    if( !rule.customer(data[key]) ){
                        return false;
                    }
                }
                else{
                    if( !validator[rule.method](data[key], rule.options) ){
                        return false;
                    }
                }
            }
        }
    }
}

exports.alloc = ()=>{
    return new Validator();
};