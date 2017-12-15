'use strict';

const generate = contract => [{
	flow: 'receive',
	entity: 'landlord',
	projectId: contract.projectId,
	relativeId: contract.id,
	source: 'tenant',
	type: 'bond',
	startDate: 1,
	endDate: 2,
	dueDate: 5,
	createdAt: 4,
	dueAmount: 12000,
	submitter: 12000,
	operator: 12000,
	metadata: {}
}];

module.exports = {
	generate
}