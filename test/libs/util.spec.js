'use strict';

const {
    ParameterCheck: parameterCheck,
    ParentDivisionId: parentDivisionId,
    IsParentDivision: isParentDivision,
} = require('../../libs/util');

describe('Utils', () => {
    before(() => {
        global.log = {
            error: () => {
            },
        };
    });
    describe('ParameterCheck', () => {
        it('should check input parameters valid in list', () => {
            parameterCheck({p1: 'b', p2: 'd'}, ['p1']).should.be.equal(true);
            parameterCheck({p1: 'b', p2: 'd'}, ['p3']).should.be.equal(false);
        });
        it('should support or check in check list', () => {
            parameterCheck({p1: 'b', p2: 'd'}, ['p1|p5']).should.be.equal(true);
            parameterCheck({p1: 'b', p2: 'd'}, ['p3|p7']).
                should.
                be.
                equal(false);
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

    describe('ParentDivision', () => {
        it('should give parent division id which end with 00', () => {
            parentDivisionId('123456').should.be.equal('123400');
        });

        it('should be able to handle empty input', () => {
            parentDivisionId('').should.be.equal('00');
        });

        it('should be able to tell if an input is a parent id', () => {
            isParentDivision('123400').should.be.equal(true);
            isParentDivision('123401').should.be.equal(false);
        });

        it('should be able to handle invalid input', () => {
            isParentDivision('00').should.be.equal(false);
            isParentDivision('').should.be.equal(false);
        });
    });

});