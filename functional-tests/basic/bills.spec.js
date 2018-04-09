'use strict';

const fp = require('lodash/fp');
const {loggedIn} = require('../setup');
const {createHouse, createContract} = require('../payloads');

describe('bill api', function() {
    it('should create bills along with contract', async () => {
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
                room => client.post('/projects/100/contracts').
                    send(createContract(room.id)).
                    then(res => ({room, contract: res.body})),
            ).then(
                ({room, contract}) => client.get(
                    `/projects/100/contracts/${contract.result.id}/bills`).
                    then(res => ({room, contract, bills: res.body})),
            ).
            then(({bills, contract}) => {
                bills.length.should.be.equal(17);
                bills[0].contractId.should.be.equal(contract.result.id);
            });
    });

});