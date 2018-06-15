'use strict'

const {
  smsForBillOverdue, smsForNewContract,
  smsForNegativeBalance, smsForPowerOff,
} = require(
  '../../services/v1.0/smsService')
require('include-node')
const {stub} = require('sinon')

describe('smsService', function() {
  beforeEach(() => {
    global.log = console
  })
  describe('when creating new contract', () => {
    it('should be able to send out sms', async () => {
      global.ShortMessage = stub().resolves({Code: 'OK'})

      await smsForNewContract('projectName', 'test_number', 'username')

      ShortMessage.should.have.been.called
      const smsSent = ShortMessage.getCall(0).args[0]
      smsSent.should.be.eql({
        number: 'test_number',
        params: {
          account: 'username',
          passwd: '123456',
          project: 'projectName',
        },
        template: 'SMS_136380435',
      })

    })
    it('should be able to block if no number provided', async () => {
      global.ShortMessage = stub().resolves({Code: 'OK'})

      await smsForNewContract('projectName', undefined, 'username')

      ShortMessage.should.not.have.been.called
    })
  })
  describe('when bills are overdue', function() {
    it('should be able to send out sms', async () => {
      global.ShortMessage = stub().resolves({Code: 'OK'})

      const SequelizeModels = {
        Users: {
          findById: async () => ({
            toJSON: () => ({
              auth: {
                mobile: 'test_number',
              },
            }),
          }),
        },
      }
      await smsForBillOverdue(SequelizeModels)(
        {userId: 'userId', dueAmount: 9999})

      ShortMessage.should.have.been.called
      const smsSent = ShortMessage.getCall(0).args[0]
      smsSent.should.be.eql({
        number: 'test_number',
        params: {
          amount: '99.99',
        },
        template: 'SMS_136385466',
      })

    })
    it('should be able to block if no number provided', async () => {
      global.ShortMessage = stub().resolves({Code: 'OK'})

      const SequelizeModels = {
        Users: {
          findById: async () => ({
            toJSON: () => ({}),
          }),
        },
      }

      await smsForBillOverdue(SequelizeModels)(
        {userId: 'userId', dueAmount: 9999})

      ShortMessage.should.not.have.been.called

    })

  })

  describe('when negative balance above -20', function() {
    it('should be able to send out sms', async () => {
      global.ShortMessage = stub().resolves({Code: 'OK'})

      await smsForNegativeBalance('test_number', 'userId')

      ShortMessage.should.have.been.called
      const smsSent = ShortMessage.getCall(0).args[0]
      smsSent.should.be.eql({
        number: 'test_number',
        params: {},
        template: 'SMS_121912040',
      })

    })
    it('should be able to block if no number provided', async () => {
      global.ShortMessage = stub().resolves({Code: 'OK'})

      await smsForBillOverdue('', 'userId')

      ShortMessage.should.not.have.been.called

    })

  })

  describe('when negative balance below -20', function() {
    it('should be able to send out sms', async () => {
      global.ShortMessage = stub().resolves({Code: 'OK'})

      await smsForPowerOff('test_number', 'userId', -2100)

      ShortMessage.should.have.been.called
      const smsSent = ShortMessage.getCall(0).args[0]
      smsSent.should.be.eql({
        number: 'test_number',
        params: {amount: '21.00'},
        template: 'SMS_137421742',
      })

    })
    it('should be able to block if no number provided', async () => {
      global.ShortMessage = stub().resolves({Code: 'OK'})

      await smsForPowerOff('', 'userId')

      ShortMessage.should.not.have.been.called

    })

  })

})