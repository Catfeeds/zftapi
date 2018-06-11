'use strict';

const {httpClient, credentials} = require('../setup');
describe('login tests', function() {
  it('should allow to logout', async () => {
    await httpClient.post('/login').
      send(credentials).
      then(async res => {
        res.should.have.cookie('session');
        await httpClient.post('/logout').then(res => {
          res.body.code.should.be.eql(0);
        });
      });
  });
});