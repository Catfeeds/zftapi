'use strict';

import {get} from '../../services/v1.0/handlers/projects/:projectId/credentials'
import 'include-node'
import {spy, match} from 'sinon'

describe('Environments', function () {
	before(() => {
		global.Typedef = Include('/libs/typedef');
	});
	it('should return all credentials from findAll', async function () {
		const req = {params: {
			projectId: 100
		}};
		global.MySQL = {
			Auth: {
				async findAll() {
					return [];
				}
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() =>
			resSpy.should.have.been.calledWith([])
		)
	});

	it('should omit id, createdAt, updatedAt, password fields', async function () {
		const req = {params: {
			projectId: 100
		}};
		global.MySQL = {
			Auth: {
				async findAll() {
					return [{dataValues: {id: 1, createdAt: 2, updatedAt: 3, password: '123', onlyMe: 'haha'}}];
				}
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() =>
			resSpy.should.have.been.calledWith([{onlyMe: 'haha'}])
		)
	});

	it('should omit null value fields', async function () {
		const req = {params: {
			projectId: 100
		}};
		global.MySQL = {
			Auth: {
				async findAll() {
					return [{dataValues: {nullField1: null, nullField2: null, onlyMe: 'haha'}}];
				}
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() =>
			resSpy.should.have.been.calledWith([{onlyMe: 'haha'}])
		)
	});

});