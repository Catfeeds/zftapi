'use strict';

const {ParameterCheck: parameterCheck} = require('../../libs/util');

describe('ParameterCheck', () => {
    before(() => {
        global.log = { error: () => {}};
    });
    it('should check input parameters valid in list', () => {
        parameterCheck({p1: 'b', p2: 'd'}, ['p1']).should.be.equal(true);
        parameterCheck({p1: 'b', p2: 'd'}, ['p3']).should.be.equal(false);
    });
    it('should support or check in check list', () => {
        parameterCheck({p1: 'b', p2: 'd'}, ['p1|p5']).should.be.equal(true);
        parameterCheck({p1: 'b', p2: 'd'}, ['p3|p7']).should.be.equal(false);
        parameterCheck({p1: 'b', p7: 'd'}, ['|p7']).should.be.equal(false);
    });
    it('should deny or check if the checkItem start with |', () => {
        parameterCheck({p1: 'b', p7: 'd'}, ['|p7']).should.be.equal(false);
    });
    it('should be valid by default', () => {
        parameterCheck({}, []).should.be.equal(true);
    });

    it('should be false if not enough parameters are given', () => {
        parameterCheck({}).should.be.equal(false);
        parameterCheck(null, []).should.be.equal(false);
    });
});