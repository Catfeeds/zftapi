'use strict';

const {loggedIn} = require('../setup');
const {createHouse} = require('../payloads');
describe('houses api', function() {
    it('should allow to create houses', async () => {
        const client = await loggedIn();
        await client.post('/projects/100/houses?houseFormat=SHARE').send(createHouse).then(res => {
            res.body.code.should.be.eql(createHouse.code);
        });
    });

    it('should allow to retrieve houses', async () => {
        const client = await loggedIn();
        await client.get('/projects/100/houses?houseFormat=SHARE').then(res => {
            res.body.data.length.should.be.eql(1);
            res.body.data[0].code.should.be.eql(createHouse.code);
        });
    });
});