const axios = require('axios');
const _ = require('lodash');
const got = require('got');
const config = require('config');


const URL = 'http://restapi.amap.com/v3/assistant/';

function ParameterToQuery(param) {
    let values = [];
    _.mapKeys(param, (v, k)=>{
        values.push(`${k}=${encodeURIComponent(v)}`);
    });
    return values.toString().replace(/,/g, '&');
}

exports.InputTips = (query)=>{
    return new Promise((resolve, reject)=>{
        const reqStr = ParameterToQuery(query);
        const reqURL = `${URL}inputtips?output=json&key=${config.MAP}&${reqStr}`;

        (async () => {
            try {
                const response = await got(reqURL);
                const body = JSON.parse(response.body);
                resolve(body.tips);
            } catch (error) {
                log.error(error.response.body);
            }
        })();
    });
};