'use strict';

class RoomUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RoomUnavailableError';
    }
}

class UsernameDuplicateError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UsernameDuplicateError';
    }
}

module.exports = {
    RoomUnavailableError,
    UsernameDuplicateError,
};