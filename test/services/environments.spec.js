'use strict';

import {get} from '../../services/v1.0/handlers/environments'
import 'include-node'
import _ from 'lodash'
import {spy, match} from 'sinon'

describe('Environments', function () {
	before(() => {
		global.Typedef = Include('/libs/typedef');
	})
	it('should return constants of zft project', function () {
		const req = {isAuthenticated: () => true};
		const resSpy = spy();

		get(req, {send: resSpy});

		const response = resSpy.getCall(0).args[0];
		response.should.shallowDeepEqual({
			length: 4,
			0: {key: 'houseFormat'},
			1: {key: 'roomType'},
			2: {key: 'operationStatus'},
			3: {key: 'orientation'},
		});
	});

	it('should return user info while user logged in', function () {
		const user = {projectId: 99};
		const req = {isAuthenticated: () => true, user};
		const resSpy = spy();

		get(req, {send: resSpy});

		const response = resSpy.getCall(0).args[0];
		response.should.shallowDeepEqual({
			length: 5,
			0: {key: 'houseFormat'},
			1: {key: 'roomType'},
			2: {key: 'operationStatus'},
			3: {key: 'orientation'},
			4: {key: 'user', value: user},
		});
	});
});