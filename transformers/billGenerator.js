'use strict';

const generate = contract => [{
	flow: 'receive',
	entity: 'landlord',
	projectId: 'projectid',
	relativeID: contract.id,
	metadata: {}
}];

module.exports = {
	generate
}