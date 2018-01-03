'use strict';

import {get} from '../../services/v1.0/handlers/projects/:projectId/rooms'
import 'include-node'
import {spy} from 'sinon'

describe('Rooms', function () {
	before(() => {
		global.Typedef = Include('/libs/typedef');
		global.Util = Include('/libs/util');
	});
	it('should return all contracts from findAndCountAll', async function () {

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
								House: {
									dataValues: {
										id: 456,
										roomNumber: 'roomNumber',
										Building: {
											dataValues: {
												group: 'group1',
												building: 'building1',
												unit: 'unit1',
												Location: {
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
					roomName: 'roomName'
				}]);
			}
		)
	});
});