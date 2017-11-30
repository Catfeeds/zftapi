'use strict';

const _ = require('lodash');

const extract = req => ({
	name: 'Abraham',
	accountName: _.get(req, 'user.accountName'),
	mobile: '12345678911',
	documentId: '12345678911',
	documentType: 1,
	gender: 'M'
});

module.exports = {
	extract
}