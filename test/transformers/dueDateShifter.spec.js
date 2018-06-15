'use strict'
const moment = require('moment')
const {dueDateShifter, onDisplayShift} = require(
  '../../transformers/dueDateShifter')

describe('DateShifter', () => {
  describe('DueDateShifter', () => {
    it('should not modify the first due date always', () => {
      const startDate = moment().unix()
      const oneYearLater = moment().add(1, 'year').unix()
      const pattern = '1'
      const paymentPlan = '-03'
      dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan,
        startDate).should.eql(startDate)
    })

    it('should apply the paymentPlan since the second bill cycles', () => {
      const startDate = moment('2017-12-11').unix()
      const oneYearLater = moment('2018-12-10').unix()
      const secondMonth = moment('2018-01-11').unix()
      const expectBillDate = moment('2018-01-08').unix()
      const pattern = '1'
      const paymentPlan = '-03'
      dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan,
        secondMonth).should.eql(expectBillDate)
    })

    it('should give date base on paymentPlan pattern', () => {
      const startDate = moment('2017-12-11').unix()
      const oneYearLater = moment('2018-12-10').unix()
      const secondMonth = moment('2018-01-11').unix()
      const expectBillDate = moment('2018-01-07').unix()
      const pattern = '1'
      const paymentPlan = '-04'
      dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan,
        secondMonth).should.eql(expectBillDate)
    })

    it('should give same date back if pattern is invalid', () => {
      const startDate = moment('2017-12-11').unix()
      const oneYearLater = moment('2018-12-10').unix()
      const secondMonth = moment('2018-01-11').unix()
      const pattern = '1'
      const paymentPlan = '-100'
      dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan,
        secondMonth).should.eql(secondMonth)
    })

    it('should give date inside billing cycle', () => {
      const startDate = moment('2017-12-11').unix()
      const oneYearLater = moment('2018-12-10').unix()
      const secondMonth = moment('2018-01-11').unix()
      const expectBillDate = moment('2018-02-02').unix()
      const pattern = '1'
      const paymentPlan = '+02'
      dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan,
        secondMonth).should.eql(expectBillDate)
    })

    it('should give same date if date match the fix day', () => {
      const startDate = moment('2017-12-11').unix()
      const oneYearLater = moment('2018-12-10').unix()
      const secondMonth = moment('2018-01-11').unix()
      const expectBillDate = moment('2018-01-11').unix()
      const pattern = '1'
      const paymentPlan = '+11'
      dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan,
        secondMonth).should.eql(expectBillDate)
    })

    it('should apply fixedBeforeBill pattern', () => {
      const startDate = moment('2017-12-11').unix()
      const oneYearLater = moment('2018-12-10').unix()
      const secondMonth = moment('2018-01-11').unix()
      const expectBillDate = moment('2018-01-05').unix()
      const pattern = '1'
      const paymentPlan = 'F05'
      dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan,
        secondMonth).should.eql(expectBillDate)
    })

    it('should pick most recent date before bill cycle in fixedBeforeBill pattern',
      () => {
        const startDate = moment('2017-12-11').unix()
        const oneYearLater = moment('2018-12-10').unix()
        const secondMonth = moment('2018-01-11').unix()
        const expectBillDate = moment('2017-12-20').unix()
        const pattern = '1'
        const paymentPlan = 'F20'
        dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan,
          secondMonth).should.eql(expectBillDate)
      })

    it('should apply fixedBeforeOneMonth pattern', () => {
      const startDate = moment('2017-12-11').unix()
      const oneYearLater = moment('2018-12-10').unix()
      const secondMonth = moment('2018-01-11').unix()
      const expectBillDate = moment('2017-12-05').unix()
      const pattern = '1'
      const paymentPlan = 'M05'
      dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan,
        secondMonth).should.eql(expectBillDate)
    })

    it('should pick date at one month before bill date in fixedBeforeOneMonth pattern',
      () => {
        const startDate = moment('2017-12-11').unix()
        const oneYearLater = moment('2018-12-10').unix()
        const fourthMonth = moment('2018-03-11').unix()
        const expectBillDate = moment('2018-02-23').unix()
        const pattern = '1'
        const paymentPlan = 'M23'
        dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan,
          fourthMonth).should.eql(expectBillDate)
      })

    it('should give the same date back if the bill start date does not match with the billing cycles',
      () => {
        const startDate = moment('2017-12-11').unix()
        const oneYearLater = moment('2018-12-10').unix()
        const randomDate = moment('2018-03-01').unix()
        const expectBillDate = moment('2018-03-01').unix()
        const pattern = '6'
        const paymentPlan = 'M23'
        dueDateShifter(startDate, oneYearLater)(pattern, paymentPlan,
          randomDate).should.eql(expectBillDate)
      })
  })
  describe('onDisplayShift', () => {
    it('should shift one minute before the real end date for display purpose for all bills but the last one',
      () => {
        onDisplayShift(
          [{endDate: moment('2018-01-31').unix()}, {endDate: 1}]).
          should.
          be.
          eql([
            {
              endDate: moment('2018-01-31').
                subtract(12, 'hour').
                unix(),
            },
            {endDate: 1}])
      })
    it('should not modify if only one bill',
      () => {
        onDisplayShift([{endDate: 100}]).
          should.
          be.
          eql([{endDate: 100}])
      })
    it('should be able to handle empty list',
      () => {
        onDisplayShift([]).
          should.
          be.
          eql([])
      })
  })
})