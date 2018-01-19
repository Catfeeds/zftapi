'use strict';

const {get, put} = require('../../services/v1.0/handlers/projects/:projectId');
require('include-node');
const {spy} = require('sinon');

describe('Project', function () {
	before(() => {
		global.Typedef = Include('/libs/typedef');
	});
	it('should return project info by pid', async function () {
		const projectInfo = {
			dataValues: {
				name: 'myName'
			}
		};
		const req = {
			params: {
				projectId: 100
			}
		};
		global.MySQL = {
			Projects: {
				async findOne() {
					return projectInfo;
				}
			}
		};

		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
			const response = resSpy.getCall(0).args[0];
			response.should.be.eql(projectInfo.dataValues);
		});
	});

	it('should allow to update project partially', async function () {
		const req = {
			params: {
				projectId: 100
			},
			body: {
				id: 312,
				name: 'myName'
			}
		};
		global.MySQL = {
			Projects: {
				async update() {
					return {id: req.body.id};
				}
			}
		};

		const resSpy = spy();

		await put(req, {send: resSpy}).then(() => {
			resSpy.getCall(0).args[0].should.be.eql(200);
			resSpy.getCall(0).args[1].result.should.be.eql({id: 312});
		});
	});

	it('should give 400 if no project db id is provided', async function () {
		const req = {
			params: {
				projectId: 100
			},
			body: {
				name: 'myName'
			}
		};

		const resSpy = spy();

		await put(req, {send: resSpy}).then(() => {
			resSpy.getCall(0).args[0].should.be.eql(400);
			resSpy.getCall(0).args[1].result.should.be.eql({error: 'please provide db id of this project'});
		});
	});
});