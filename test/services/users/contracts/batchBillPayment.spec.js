const {moveFundChannelToRoot} = require(
    '../../../../services/v1.0/handlers/projects/:projectId/users/:userId/contracts/:contractId/batchBillPayment');

describe('payments', function() {
    it('should pick serviceCharge and other attributes from result',
        async function() {
            moveFundChannelToRoot(
                {
                    toJSON: () => ({id: 99}),
                    fundChannel: {aField: 1, serviceCharge: 2, notMe: 3},
                },
            )(['aField']).should.be.eql({id: 99, serviceCharge: 2, aField: 1});
        });

    it('should return empty if result is empty', async function() {
        moveFundChannelToRoot({toJSON: () => ({})})([]).should.be.eql({});
    });
});