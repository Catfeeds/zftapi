'use strict'
const clearUpFields = require('../../transformers/billItemsCleaner').clearUpFields

describe('Bill generator', () => {
  it('should omit null fields', () => {
    clearUpFields({id: 1, dead: null, survive: 1, billItems: []})
      .should.eql({id: 1, survive: 1, billItems: []})
  })

  it('should omit null fields even in billItems array', () => {
    const origin = {dead: null, survive: 1, keepMe: 0}
    const after = {survive: 1, keepMe: 0}
    clearUpFields({billItems: [origin, origin]})
      .should.eql({billItems: [after, after]})
  })

  it('should omit null fields only', () => {
    clearUpFields({no: null, yes1: 1, yes2: 0, yes3: undefined, yes4: [], yes5: {}})
      .should.eql({billItems: [], yes1: 1, yes2: 0, yes3: undefined, yes4: [], yes5: {}})
  })
})