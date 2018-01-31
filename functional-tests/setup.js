'use strict';
const chai = require('chai');
const axios = require('axios');
chai.should();

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.use(require('chai-shallow-deep-equal'));

module.exports = {
    axios: axios.create({
        baseURL: process.env.APP_URL,
        withCredentials: true
    })
}