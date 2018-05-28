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
                room => client.post('/projects/100/contracts').
                    send(createContract(room.id)).
                    then(res => ({room, contract: res.body})),
            ).then(
                ({room, contract}) => client.get(
                    `/projects/100/contracts/${contract.result.id}`).
                    then(res => ({
                        expectedId: contract.result.id,
                        contract: res.body,
                        room,
                    })),
            ).
            then(({expectedId, contract, room}) => {
                contract.id.should.be.eql(expectedId);
                contract.roomId.should.be.equal(room.id);
            });
    });

    it('should retrieve contracts under roomId', async () => {
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
                ({room, contract}) => Promise.all([client.get(
                    `/projects/100/rooms/${room.id}/contracts`),
                client.get(
                    `/projects/100/contracts/${contract.result.id}`)]),
            ).
            then(([roomContract, contract]) => {
                roomContract.body.data[0].user.should.be.eql(contract.body.user);
            });
    });
});