'use strict';

import {get} from '../../services/v1.0/handlers/projects/:projectId/contracts'
import 'include-node'
import {spy, stub} from 'sinon'
import _ from 'lodash'

describe('Contracts', function () {
	before(() => {
		global.Typedef = Include('/libs/typedef');
		global.ErrorCode = Include('/libs/errorCode');
		global.Util = Include('/libs/util');
	});
	it('should return all contracts from findAndCountAll', async function () {
		const contract = {dataValues: {expenses: '[]', strategy: '{}'}};
		const req = {
			params: {
				projectId: 100
			},
			query: {}

		};
		global.MySQL = {
			Contracts: {
				async findAndCountAll() {
					return {
						count: 1,
						rows: [contract]
					};
				}
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
				resSpy.should.have.been.called;
				resSpy.getCall(0).args[0].data.should.be.eql([{expenses: [], strategy: {}}]);
			}
		)
	});

	it('should omit createdAt, updatedAt, userId fields', async function () {
		const req = {
			params: {
				projectId: 100
			},
			query: {}
		};
		global.MySQL = {
			Contracts: {
				async findAndCountAll() {
					return {
						count: 1,
						rows: [{
							dataValues: {
								id: 1,
								createdAt: 2,
								updatedAt: 3,
								userId: 123,
								andMe: 'haha',
								expenses: '[]',
								strategy: '{}'
							}
						}]
					};
				}
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
			resSpy.should.have.been.called;
			resSpy.getCall(0).args[0].data.should.be.eql([{id: 1, andMe: 'haha', expenses: [], strategy: {}}]);
		})
	});

	it('should omit null value fields', async function () {
		const req = {
			params: {
				projectId: 100
			},
			query: {}
		};
		global.MySQL = {
			Contracts: {
				async findAndCountAll() {
					return {
						count: 1,
						rows: [{
							dataValues: {
								nullField1: null,
								nullField2: null,
								onlyMe: 'haha',
								expenses: '[]',
								strategy: '{}'
							}
						}]
					};
				}
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
				resSpy.should.have.been.called;
				resSpy.getCall(0).args[0].data[0].onlyMe.should.be.eql('haha');
			}
		)
	});

	it('should connect with houses if query with houseFormat', async function () {
		const req = {
			params: {
				projectId: 100
			},
			query: {
				houseFormat: 'SOLE'
			}
		};
		const sequelizeFindSpy = stub().resolves([]);
		const Users = {};
		const Rooms = {};
		const Houses = {};
		global.MySQL = {
			Contracts: {
				findAndCountAll: sequelizeFindSpy
			},
			Users,
			Rooms,
			Houses
		};

		await get(req, {send: _.noop}).then(() => {
				sequelizeFindSpy.should.have.been.called;
				const modelOptions = sequelizeFindSpy.getCall(0).args[0];
				modelOptions.include.should.be.eql([
					{
						model: Users, required: true
					},
					{
						model: Rooms,
						required: true,
						attributes: ['id'],
						include: [
							{
								model: Houses,
								as: 'house',
								required: true,
								attributes: ['id'],
								where: {
									houseFormat: 'SOLE'
								}
							}
						]
					}
				])
			}
		)
	});
});