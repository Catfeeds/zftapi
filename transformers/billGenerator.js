'use strict';

const generateForContract = contract => [{
	flow: 'receive',
	entityType: 'property',
	projectId: contract.projectId,
	contractId: contract.id,
	source: 'contract',
	type: 'rent',
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
	generateForContract
}