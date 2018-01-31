'use strict';

const {axios} = require('../setup');

describe('login tests', function() {
    it('should allow to login', async () => {
        console.log(axios);
        await axios.post('http://api:8000/v1.0/login', {
            username: 'admin100',
            password: '5f4dcc3b5aa765d61d8327deb882cf99',
        }).then(function(response) {
            response.data.code.should.be.eql(0);
        });
    });

    it('should allow to logout', async () => {
        await axios.post('http://api:8000/v1.0/logout', {}).
            catch(function(err) {
                err.response.status.should.be.eql(401);
            });
    });
});