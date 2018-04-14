const fp = require('lodash/fp');
const got = require('got');
const config = require('config');

const URL = 'http://restapi.amap.com/v3/assistant/';

const toURLQuery = fp.pipe(fp.entries,
    fp.map(([k, v]) => `${k}=${encodeURIComponent(v)}`),
    fp.join('&'));

exports.toURLQuery = toURLQuery;

exports.InputTips = (query) => {
    return new Promise((resolve, reject) => {
        const reqStr = toURLQuery(query);
        const reqURL = `${URL}inputtips?output=json&key=${config.MAP}&${reqStr}&type=120304|120303|120302|120301|120300|120203|120202|120201|120200|120100|120000|100201|100200|100105|100104|100103|100102|100100|100000`;

        (async () => {
            try {
                const response = await got(reqURL);
                const body = JSON.parse(response.body);
                resolve(body.tips);
            } catch (error) {
                log.error(error.response.body);
                reject(error);
            }
        })();
    });
};