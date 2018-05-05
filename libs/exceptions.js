'use strict';

class RoomUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RoomUnavailableError';
        this.errorCode = ErrorCode.ROOMINCONTRACT;
    }

}

class UsernameDuplicateError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UsernameDuplicateError';
        this.errorCode = ErrorCode.USEREXISTS;
    }
}

class ContractError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ContractError';
        this.errorCode = ErrorCode.CONTRACTINVALID;
    }
}

module.exports = {
    RoomUnavailableError,
    UsernameDuplicateError,
    ContractError,
};