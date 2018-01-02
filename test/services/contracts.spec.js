'use strict';

import {get} from '../../services/v1.0/handlers/projects/:projectId/contracts'
import 'include-node'
import {spy} from 'sinon'

describe('Contracts', function () {
	before(() => {
		global.Typedef = Include('/libs/typedef');
		global.ErrorCode = Include('/libs/errorCode');
		global.Util = Include('/libs/Util');
	});
	it('should return all contracts from findAndCountAll', async function () {
		const contract = {};
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
				resSpy.getCall(0).args[0].data.should.be.eql([contract]);
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
						rows: [{dataValues: {id: 1, createdAt: 2, updatedAt: 3, userId: 123, andMe: 'haha'}}]
					};
				}
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
			resSpy.should.have.been.called;
			resSpy.getCall(0).args[0].data.should.be.eql([{id: 1, andMe: 'haha'}]);
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
						rows: [{dataValues: {nullField1: null, nullField2: null, onlyMe: 'haha'}}]
					};
				}
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
				resSpy.should.have.been.called;
				resSpy.getCall(0).args[0].data.should.be.eql([{onlyMe: 'haha'}]);
			}
		)
	});
});