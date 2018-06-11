'use strict';
const chai = require('chai');
chai.should();

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.use(require('chai-shallow-deep-equal'));
chai.use(require('chai-http'));

exports.httpClient = chai.request.agent('http://api:8000/v1.0');
exports.credentials = {
  username: 'admin100',
  password: '5f4dcc3b5aa765d61d8327deb882cf99',
};
exports.loggedIn = async () => {
  await exports.httpClient.post('/login').
    send(exports.credentials);
  return exports.httpClient;
};