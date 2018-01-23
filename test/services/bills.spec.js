'use strict';

const {get} = require('../../services/v1.0/handlers/projects/:projectId/bills');
require('include-node');
const {spy, stub} = require('sinon');
const fp  = require('lodash/fp');

const stubRoom = {dataValues: {house: {dataValues: {building: {dataValues: {location: {dataValues: {}}}}}}}};

describe('Bills', function () {
	before(() => {
		global.Typedef = Include('/libs/typedef');
		global.ErrorCode = Include('/libs/errorCode');
		global.Util = Include('/libs/util');
	});
	it('should return all contracts from findAndCountAll', async function () {
		const bill = {dataValues: {contract: {dataValues: {room: stubRoom}}}};
		const req = {
			params: {
				projectId: 100
			},
			query: {}

		};
		const Users = {id: 100};
		const Rooms = {id: 0};
		const Houses = {id: 1};
		const Building = {id: 2};
		const GeoLocation = {id: 3};
		const BillFlows = {id: 4};
		const Contracts = {id: 5};
		global.MySQL = {
			Bills: {
				async findAndCountAll() {
					return {
						count: 1,
						rows: [bill]
					};
				}
			},
			Users,
			Rooms,
			Houses,
			Building,
			GeoLocation,
			BillFlows,
			Contracts
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
			resSpy.should.have.been.called;
			resSpy.getCall(0).args[0].data[0].contract.should.be.eql({});
			resSpy.getCall(0).args[0].data[0].user.should.be.eql({});
		}
		);
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
		const BillPayment = {id: 111};
		const Users = {id: 100};
		const Rooms = {id: 0};
		const Houses = {id: 1};
		const Building = {id: 2};
		const GeoLocation = {id: 3};
		const BillFlows = {id: 4};
		const Contracts = {id: 5};
		global.MySQL = {
			Bills: {
				findAndCountAll: sequelizeFindSpy
			},
			Users,
			Rooms,
			Houses,
			Building,
			GeoLocation,
			BillFlows,
			BillPayment,
			Contracts
		};

		await get(req, {send: fp.noop}).then(() => {
			sequelizeFindSpy.should.have.been.called;
			const modelOptions = sequelizeFindSpy.getCall(0).args[0];
			modelOptions.include.should.be.eql([{
				'as': 'billItems',
				'attributes': [
					'configId',
					'amount',
					'createdAt',
					'id',
				],
				'model': BillFlows
			}, {
				'as': 'payments',
				'attributes': [
					'id',
					'amount',
					'fundChannelId',
					'operator',
					'paidAt',
					'remark',
					'status'
				],
				'model': BillPayment,
				required: false
			},
			{
				'include': [
					{
						'model': Users,
						'required': true
					},
					{
						'attributes': [
							'id',
							'name'
						],
						'include': [
							{
								'as': 'house',
								'attributes': [
									'id',
									'roomNumber'
								],
								'include': [
									{
										'as': 'building',
										'attributes': [
											'building',
											'unit'
										],
										'include': [
											{
												'as': 'location',
												'attributes': [
													'name'
												],
												'model': GeoLocation,
												'required': true
											}
										],
										'model': Building,
										'required': true
									}
								],
								'model': Houses,
								'required': true,
								'where': {
									'houseFormat': 'SOLE'
								}
							}
						],
						'model': Rooms,
						'required': true
					}
				],
				model: Contracts,
				where: {
					status: 'ONGOING'
				}
			}]);
		});
	});
});