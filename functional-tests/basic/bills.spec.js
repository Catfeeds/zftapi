'use strict'

const fp = require('lodash/fp')
const {loggedIn} = require('../setup')
const {createHouse, createContract} = require('../payloads')

describe('bill api', function() {
  it('should create bills along with contract', async () => {
    const client = await loggedIn()
    const housePayload = createHouse()
    const houseRes = await client.post(
      '/projects/100/houses?houseFormat=SHARE').
      send(housePayload).then(res => res.body)
    const room = await client.get(
      `/projects/100/houses/${houseRes.id}?houseFormat=SHARE`).
      then(res => fp.head(res.body.rooms))

    const contract = await client.post('/projects/100/contracts').
      send(createContract(room.id)).
      then(res => res.body)

    const contractBills = await client.get(
      `/projects/100/contracts/${contract.result.id}/bills`).
      then(res => res.body)

    contractBills.length.should.be.equal(12)
    contractBills[0].contractId.should.be.equal(contract.result.id)
  })
})