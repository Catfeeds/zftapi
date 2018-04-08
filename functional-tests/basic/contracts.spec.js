'use strict';

const fp = require('lodash/fp');
const {loggedIn} = require('../setup');
const {createHouse, createContract} = require('../payloads');

describe('contract api', function() {
    it('should allow to create contract', async () => {
        const client = await loggedIn();
        const housePayload = createHouse();
        await client.post('/projects/100/houses?houseFormat=SHARE').
            send(housePayload).
            then(res => client.get(
                `/projects/100/houses/${res.body.id}?houseFormat=SHARE`)).
            then(
                res => fp.head(res.body.rooms),
            ).
            then(
                room => {
                    return client.post('/projects/100/contracts').
                        send(createContract(room.id));
                },
            ).then(
                () => client.get('/projects/100/contracts'),
            ).
            then(res => {
                res.body.data.length.should.be.equal(1);
                res.body.data[0].roomId.should.not.be.empty;
            });
    });

});