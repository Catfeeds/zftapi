'use strict';

import {get} from '../../services/v1.0/handlers/projects/:projectId/bills'
import 'include-node'
import {spy, stub} from 'sinon'
import _ from 'lodash'

describe('Bills', function () {
	before(() => {
		global.Typedef = Include('/libs/typedef');
		global.ErrorCode = Include('/libs/errorCode');
		global.Util = Include('/libs/util');
	});
	it('should return all contracts from findAndCountAll', async function () {
		const bill = {dataValues: {}};
		const req = {
			params: {
				projectId: 100
			},
			query: {}

		};
		global.MySQL = {
			Bills: {
				async findAndCountAll() {
					return {
						count: 1,
						rows: [bill]
					};
				}
			},
			BillFlows: {}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
				resSpy.should.have.been.called;
				resSpy.getCall(0).args[0].data.should.be.eql([{}]);
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

		global.MySQL = {
			Bills: {
				findAndCountAll: sequelizeFindSpy
			},
			BillFlows: {}
		};

		await get(req, {send: _.noop}).then(() => {
			sequelizeFindSpy.should.have.been.called;
			const modelOptions = sequelizeFindSpy.getCall(0).args[0];
			modelOptions.include.should.be.eql([{
				"as": "billItems",
				"attributes": [
					"configId",
					"amount",
					"createdAt",
					"id",
				],
				"model": global.MySQL.BillFlows
			}])
		})
	});
});