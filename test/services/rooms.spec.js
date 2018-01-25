'use strict';

const {get} = require('../../services/v1.0/handlers/projects/:projectId/rooms');
require('include-node');
const {spy} = require('sinon');
const moment = require('moment');
const fp = require('lodash/fp');

describe('Rooms', function () {
	before(() => {
		global.Typedef = Include('/libs/typedef');
		global.Util = Include('/libs/util');
	});

	it('should return all rooms from findAndCountAll', async function () {
		const req = {
			params: {
				projectId: 100
			},
			query: {houseFormat: 'SHARE', q: 'q'}

		};
		global.MySQL = {
			Rooms: {
				async findAndCountAll() {
					return {
						count: 1,
						rows: [{
							dataValues: {
								id: 123,
								name: 'roomName',
								house: {
									dataValues: {
										id: 456,
										roomNumber: 'roomNumber',
										building: {
											dataValues: {
												group: 'group1',
												building: 'building1',
												unit: 'unit1',
												location: {
													dataValues: {
														name: 'locationName'
													}
												}
											}
										}
									}
								}
							}
						}]
					};
				}
			},
			Sequelize: {
				literal: fp.identity
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
			resSpy.should.have.been.called;
			resSpy.getCall(0).args[0].data.should.be.eql([{
				id: 123,
				houseId: 456,
				locationName: 'locationName',
				group: 'group1',
				building: 'building1',
				unit: 'unit1',
				roomNumber: 'roomNumber',
				roomName: 'roomName',
				status: Typedef.OperationStatus.IDLE
			}]);
		});
	});

	it('should calculate status base on all contracts', async function () {
		const req = {
			params: {
				projectId: 100
			},
			query: {houseFormat: 'SHARE', q: 'q'}

		};
		const before = moment().subtract(1, 'year').unix();
		const after = moment().add(1, 'year').unix();
		global.MySQL = {
			Rooms: {
				async findAndCountAll() {
					return {
						count: 1,
						rows: [{
							contracts: [{from: before, to: after, id: '123'}],
							dataValues: {
								id: 123,
								name: 'roomName',
								house: {
									dataValues: {
										id: 456,
										roomNumber: 'roomNumber',
										building: {
											dataValues: {
												group: 'group1',
												building: 'building1',
												unit: 'unit1',
												location: {
													dataValues: {
														name: 'locationName'
													}
												}
											}
										}
									}
								}
							}
						}]
					};
				}
			},
			Sequelize: {
				literal: fp.identity
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
			resSpy.should.have.been.called;
			resSpy.getCall(0).args[0].data.should.be.eql([{
				id: 123,
				houseId: 456,
				locationName: 'locationName',
				group: 'group1',
				building: 'building1',
				unit: 'unit1',
				roomNumber: 'roomNumber',
				roomName: 'roomName',
				status: Typedef.OperationStatus.INUSE
			}]);
		});
	});
	it('should be `PAUSE` status if the `to` field is null', async function () {
		const req = {
			params: {
				projectId: 100
			},
			query: {houseFormat: 'SHARE', q: 'q'}

		};
		const before = moment().subtract(1, 'year').unix();
		global.MySQL = {
			Rooms: {
				async findAndCountAll() {
					return {
						count: 1,
						rows: [{
							suspendingRooms: [{from: before, id: '123', to: null}],
							contracts: [],
							dataValues: {
								id: 123,
								name: 'roomName',
								house: {
									dataValues: {
										id: 456,
										roomNumber: 'roomNumber',
										building: {
											dataValues: {
												group: 'group1',
												building: 'building1',
												unit: 'unit1',
												location: {
													dataValues: {
														name: 'locationName'
													}
												}
											}
										}
									}
								}
							}
						}]
					};
				}
			},
			Sequelize: {
				literal: fp.identity
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
			resSpy.should.have.been.called;
			resSpy.getCall(0).args[0].data.should.be.eql([{
				id: 123,
				houseId: 456,
				locationName: 'locationName',
				group: 'group1',
				building: 'building1',
				unit: 'unit1',
				roomNumber: 'roomNumber',
				roomName: 'roomName',
				status: Typedef.OperationStatus.PAUSED
			}]);
		});
	});
	it('should be `IDLE` status if the suspension `to` field passes', async function () {
		const req = {
			params: {
				projectId: 100
			},
			query: {houseFormat: 'SHARE', q: 'q'}

		};
		const before = moment().subtract(1, 'year').unix();
		const end = moment().subtract(1, 'month').unix();
		global.MySQL = {
			Rooms: {
				async findAndCountAll() {
					return {
						count: 1,
						rows: [{
							suspendingRooms: [{from: before, to: end, id: '123'}],
							contracts: [],
							dataValues: {
								id: 123,
								name: 'roomName',
								house: {
									dataValues: {
										id: 456,
										roomNumber: 'roomNumber',
										building: {
											dataValues: {
												group: 'group1',
												building: 'building1',
												unit: 'unit1',
												location: {
													dataValues: {
														name: 'locationName'
													}
												}
											}
										}
									}
								}
							}
						}]
					};
				}
			},
			Sequelize: {
				literal: fp.identity
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
			resSpy.should.have.been.called;
			resSpy.getCall(0).args[0].data.should.be.eql([{
				id: 123,
				houseId: 456,
				locationName: 'locationName',
				group: 'group1',
				building: 'building1',
				unit: 'unit1',
				roomNumber: 'roomNumber',
				roomName: 'roomName',
				status: Typedef.OperationStatus.IDLE
			}]);
		});
	});
	it('should be `IDLE` status if there is no contracts', async function () {
		const req = {
			params: {
				projectId: 100
			},
			query: {houseFormat: 'SHARE', q: 'q'}

		};
		global.MySQL = {
			Rooms: {
				async findAndCountAll() {
					return {
						count: 1,
						rows: [{
							dataValues: {
								id: 123,
								name: 'roomName',
								house: {
									dataValues: {
										id: 456,
										roomNumber: 'roomNumber',
										building: {
											dataValues: {
												group: 'group1',
												building: 'building1',
												unit: 'unit1',
												location: {
													dataValues: {
														name: 'locationName'
													}
												}
											}
										}
									}
								}
							}
						}]
					};
				}
			},
			Sequelize: {
				literal: fp.identity
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
			resSpy.should.have.been.called;
			resSpy.getCall(0).args[0].data.should.be.eql([{
				id: 123,
				houseId: 456,
				locationName: 'locationName',
				group: 'group1',
				building: 'building1',
				unit: 'unit1',
				roomNumber: 'roomNumber',
				roomName: 'roomName',
				status: Typedef.OperationStatus.IDLE
			}]);
		});
	});
});