'use strict';
const moment = require('moment');
const fp = require('lodash/fp');
const generate = require('../../transformers/billGenerator').generate;

const displayShift = (startDate) => moment.unix(startDate).subtract(12, 'hour').unix();

describe('Bill generator', () => {
  it('should generate bills base on contract', () => {
    const startDate = moment().unix();
    const oneYearLater = moment().add(1, 'year').unix();
    const bills = generate({
      strategy: {
        freq: {
          rent: 3600,
          pattern: '1'
        },
        bond: 0
      },
      expenses: [
        {
          configId: 111,
          rent: 2600,
          pattern: 'paidOff'
        }
      ],
      from: startDate,
      to: oneYearLater,
      paymentPlan: '-00',
      projectId: 1,
      contractId: 2,

    });
    bills.should.have.lengthOf(13);
  });

  it('should generate standard bills', () => {
    const startDate = moment().unix();
    const oneYearLater = moment().add(1, 'year').unix();
    const bills = generate({
      strategy: {
        freq: {
          rent: 3600,
          pattern: '12'
        },
        bond: 0
      },
      expenses: [],
      from: startDate,
      to: oneYearLater,
      paymentPlan: '-00',
      projectId: 1,
      id: 2,
      userId: 123,
    });
    fp.omit('createdAt')(bills[0]).should.be.eql({
      flow: 'receive',
      entityType: 'property',
      projectId: 1,
      contractId: 2,
      source: 'contract',
      type: 'rent',
      startDate: startDate,
      endDate: oneYearLater,
      dueDate: startDate,
      dueAmount: 3600 * 12,
      metadata: {
        freq: {
          rent: 3600,
          pattern: '12'
        },
        expenses: [],
        months: 12
      },
      index: 1,
      userId: 123,
    });
  });

  it('should generate one time paid off bills', () => {
    const startDate = moment().unix();
    const oneYearLater = moment().add(1, 'year').unix();
    const bills = generate({
      strategy: {
        freq: {
          rent: 3600,
          pattern: '12'
        },
        bond: 0
      },
      expenses: [{
        configId: 112,
        rent: 1000,
        pattern: 'paidOff'
      }],
      from: startDate,
      to: oneYearLater,
      paymentPlan: '-00',
      projectId: 1,
      id: 2,
      userId: 123,
    });
    const paidOffBill = fp.filter(b => b.type === 'extra')(bills);
    fp.omit('createdAt')(paidOffBill[0]).should.be.eql({
      flow: 'receive',
      entityType: 'property',
      projectId: 1,
      contractId: 2,
      source: 'contract',
      type: 'extra',
      startDate: startDate,
      endDate: oneYearLater,
      dueDate: startDate,
      dueAmount: 12000,
      metadata: {
        configId: 112,
        rent: 1000,
        pattern: 'paidOff'
      },
      userId: 123,
    });
  });
  it('should generate regular bills', () => {
    const startDate = moment().unix();
    const oneYearLater = moment().add(1, 'year').unix();
    const oneMonthLater = moment().add(1, 'month').unix();
    const bills = generate({
      strategy: {
        freq: {
          rent: 3600,
          pattern: '12'
        }
      },
      expenses: [{
        configId: 112,
        rent: 12000,
        pattern: '1'
      }],
      from: startDate,
      to: oneYearLater,
      paymentPlan: '-00',
      projectId: 1,
      id: 2,
      userId: 123,
    });

    const regularBill = fp.filter(b => b.type === 'extra')(bills);
    regularBill.should.have.length(12);
    fp.omit('createdAt')(regularBill[0]).should.be.eql({
      flow: 'receive',
      entityType: 'property',
      projectId: 1,
      contractId: 2,
      source: 'contract',
      type: 'extra',
      startDate: startDate,
      endDate: displayShift(oneMonthLater),
      dueDate: startDate,
      dueAmount: 12000,
      metadata: {
        configId: 112,
        rent: 12000,
        pattern: '1'
      },
      index: 1,
      userId: 123,
    });
  });

  it('should support paid off pattern in standard bills', () => {
    const startDate = moment().unix();
    const oneYearLater = moment().add(1, 'year').unix();
    const bills = generate({
      strategy: {
        freq: {
          rent: 3600,
          pattern: 'paidOff'
        }
      },
      expenses: [],
      from: startDate,
      to: oneYearLater,
      paymentPlan: '-00',
      projectId: 1,
      id: 2,
      userId: 123,
    });
    bills.should.have.length(1);
    fp.omit('createdAt')(bills[0]).should.be.eql({
      flow: 'receive',
      entityType: 'property',
      projectId: 1,
      contractId: 2,
      source: 'contract',
      type: 'rent',
      startDate: startDate,
      endDate: oneYearLater,
      dueDate: startDate,
      dueAmount: 43200,
      metadata: {
        freq: {
          rent: 3600,
          pattern: 'paidOff'
        },
        expenses: [],
        months: 12
      },
      index: 1,
      userId: 123,
    });
  });

  it('should combine withRent expenses into standard bills', () => {
    const startDate = moment().unix();
    const oneYearLater = moment().add(1, 'year').unix();
    const oneMonthLater = moment().add(1, 'month').unix();
    const bills = generate({
      strategy: {
        freq: {
          rent: 100,
          pattern: '1'
        }
      },
      expenses: [{
        configId: 112,
        rent: 200,
        pattern: 'withRent'
      }],
      from: startDate,
      to: oneYearLater,
      paymentPlan: '-00',
      projectId: 1,
      id: 2,
      userId: 123,
    });
    bills.should.have.length(12);
    fp.omit('createdAt')(bills[0]).should.be.eql({
      flow: 'receive',
      entityType: 'property',
      projectId: 1,
      contractId: 2,
      source: 'contract',
      type: 'rent',
      startDate: startDate,
      endDate: displayShift(oneMonthLater),
      dueDate: startDate,
      dueAmount: 300,
      metadata: {
        freq: {
          rent: 100,
          pattern: '1'
        },
        expenses: [{
          configId: 112,
          rent: 200,
          pattern: 'withRent'
        }],
        months: 1
      },
      index: 1,
      userId: 123,
    });
  });

  it('should turn withRent expenses as the same schedule as standard bills', () => {
    const startDate = moment().unix();
    const oneYearLater = moment().add(1, 'year').unix();
    const bills = generate({
      strategy: {
        freq: {
          rent: 100,
          pattern: 'paidOff'
        }
      },
      expenses: [{
        configId: 112,
        rent: 200,
        pattern: 'withRent'
      }],
      from: startDate,
      to: oneYearLater,
      paymentPlan: '-00',
      projectId: 1,
      id: 2,
      userId: 123,
    });
    bills.should.have.length(1);
    fp.omit('createdAt')(bills[0]).should.be.eql({
      flow: 'receive',
      entityType: 'property',
      projectId: 1,
      contractId: 2,
      source: 'contract',
      type: 'rent',
      startDate: startDate,
      endDate: oneYearLater,
      dueDate: startDate,
      dueAmount: 3600,
      metadata: {
        freq: {
          rent: 100,
          pattern: 'paidOff'
        },
        expenses: [{
          configId: 112,
          rent: 200,
          pattern: 'withRent'
        }],
        months: 12
      },
      index: 1,
      userId: 123,
    });
  });

  it('should generate bond bill while bond is greater than 0', () => {
    const startDate = moment().unix();
    const oneYearLater = moment().add(1, 'year').unix();
    const bills = generate({
      strategy: {
        freq: {
          rent: 100,
          pattern: 'paidOff'
        },
        bond: 100
      },
      expenses: [],
      from: startDate,
      to: oneYearLater,
      paymentPlan: '-00',
      projectId: 1,
      id: 2,
      userId: 123,
    });
    bills.should.have.length(2);
    const bondBill = fp.filter(b => b.type === 'bond')(bills);
    fp.omit('createdAt')(bondBill[0]).should.be.eql({
      flow: 'receive',
      entityType: 'property',
      projectId: 1,
      contractId: 2,
      source: 'contract',
      type: 'bond',
      startDate: startDate,
      endDate: oneYearLater,
      dueDate: startDate,
      dueAmount: 100,
      metadata: {
        bond: 100
      },
      userId: 123,
    });
  });
});