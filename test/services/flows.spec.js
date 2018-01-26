'use strict';
const {get} = require('../../services/v1.0/handlers/projects/:projectId/flows');
require('include-node');
const {stub, spy} = require('sinon');
const fp = require('lodash/fp');

describe('Flows', function () {
	before(() => {
		global.Typedef = Include('/libs/typedef');
		global.ErrorCode = Include('/libs/errorCode');
		global.Util = Include('/libs/util');
	});

	it('should pass correct option while querying flows', async function () {
		const req = {
			params: {
				projectId: 100,
				roomId: 200
			},
			query: {}
		};
		const sequelizeFindSpy = stub().resolves([]);
		const Users = {id: 100};
		const CashAccount = {findOrCreate: async () => ([{id: 321, userId: 1999}])};
		const Rooms = {id: 0};
		const Houses = {id: 1};
		const Building = {id: 2};
		const GeoLocation = {id: 3};
		const Topup = {id: 4};
		const Auth = {id: 5};
		const BillPayment = {id: 6};
		const Contracts = {id: 7};
		const Bills = {id: 8};
		global.MySQL = {
			Flows: {
				findAndCountAll: sequelizeFindSpy,
			},
			Users,
			CashAccount,
			Rooms,
			Houses,
			Building,
			GeoLocation,
			Topup,
			Auth,
			Contracts,
			BillPayment,
			Bills
		};

		await get(req, {send: fp.noop}).then(() => {
			sequelizeFindSpy.should.have.been.called;
			const countingOption = sequelizeFindSpy.getCall(0).args[0];
			countingOption.should.be.eql({
				distinct: true,
				include: [
					{
						include: [
							{
								attributes: [
									'id',
									'type'
								],
								include: [
									{
										include: [
											{
												model: Users,
												required: true
											},
											{
												attributes: [
													'id',
													'name'
												],
												include: [
													{
														as: 'house',
														attributes: [
															'id',
															'roomNumber'
														],
														include: [
															{
																as: 'building',
																attributes: [
																	'building',
																	'unit'
																],
																include: [
																	{
																		as: 'location',
																		attributes: [
																			'name'
																		],
																		model: {
																			id: 3
																		},
																		required: true
																	}
																],
																model: Building,
																required: true
															}
														],
														model: Houses,
														required: true
													}
												],
												model: Rooms,
												required: true
											}
										],
										model: Contracts
									}
								],
								model: Bills,
								required: true
							},
							{
								attributes: [
									'id',
									'username'
								],
								model: Auth
							}
						],
						model: BillPayment
					},
					{
						include: [{
							include: [
								{
									model: Users,
									required: true
								},
								{
									attributes: [
										'id',
										'name'
									],
									include: [
										{
											as: 'house',
											attributes: [
												'id',
												'roomNumber'
											],
											include: [
												{
													as: 'building',
													attributes: [
														'building',
														'unit'
													],
													include: [
														{
															as: 'location',
															attributes: [
																'name'
															],
															model: GeoLocation,
															required: true
														}
													],
													model: Building,
													required: true
												}
											],
											model: Houses,
											required: true
										}
									],
									model: Rooms,
									required: true
								}
							],
							model: Contracts
						},
						{
							as: 'operatorInfo',
							attributes: [
								'id',
								'username'
							],
							model: Auth
						}
						],
						model: Topup
					}
				],
				limit: 10,
				offset: 0,
				where: {
					projectId: 100
				}
			});
		});
	});

	it('should convert bill payments to flows', async function () {
		const req = {
			params: {
				projectId: 100
			},
			query: {}
		};
		global.MySQL = {
			Flows: {
				async findAndCountAll() {
					return {
						count: 1,
						rows: [{
							topup: null,
							dataValues: {
								'id': '6361500865072861184',
								'projectId': 100,
								'category': 'rent',
								'createdAt': '2018-01-23T09:33:17.000Z',
								'updatedAt': '2018-01-23T09:33:17.000Z',
								'deletedAt': null,
							},
							billpayment: {
								dataValues: {
									'id': '6361500865093832704',
									'billId': '6361497127071387648',
									'projectId': 100,
									'flowId': '6361500865072861184',
									'amount': 75600,
									'fundChannelId': 3,
									'operator': 1,
									'paidAt': 1516699996,
									'remark': '',
									'status': 'pending',
									'createdAt': '2018-01-23T09:33:17.000Z',
									'updatedAt': '2018-01-23T09:33:17.000Z',
									'deletedAt': null,
									auth: {
										'id': 1,
										'username': 'admin100'
									},
									bill: {
										dataValues: {
											'metadata': {},
											'id': '6361497127071387648',
											'type': 'rent',
										},
										contract: {
											'user': {
												'id': 1,
												'accountName': 'f1',
												'name': 'www',
												'mobile': '',
												'documentId': '',
												'documentType': 1,
												'gender': 'M'
											},
											room: {
												dataValues: {
													'config': {},
													'id': '6361497057362055170',
													'name': '1',
													'status': 'IDLE',
													house: {
														dataValues: {
															'config': {},
															'id': '6361497057362055168',
															'roomNumber': '2301',
															building: {
																dataValues: {
																	'config': {},
																	'building': '一幢',
																	'unit': '1单元',
																	'group': '某',
																	location: {
																		dataValues: {
																			'name': '新帝朗郡'
																		}
																	}

																}
															}

														}
													}
												}
											},
											'id': '6361497126945558528',
											'roomId': '6361497057362055170',
											'projectId': 100,
											'from': 1513599462,
											'to': 1545135462,
											'contractNumber': '',
											'paymentPlan': 'F02',
											'signUpTime': 1513599462,
											'status': 'ONGOING',
											'actualEndDate': null,
											'createdAt': '2018-01-23T09:18:25.000Z',
											'updatedAt': '2018-01-23T09:18:25.000Z',
											'deletedAt': null,
											'userId': 1,
										}
									}

								},

							}
						}]
					};
				}
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
			resSpy.should.have.been.called;
			resSpy.getCall(0).args[0].data[0].should.be.eql({
				'amount': 75600,
				'category': 'rent',
				'contract': {
					'id': '6361497126945558528',
					'from': 1513599462,
					'to': 1545135462,
					'status': 'ONGOING',
					'actualEndDate': null
				},
				'fundChannelId': 3,
				'id': '6361500865072861184',
				'operator': {
					'id': 1,
					'username': 'admin100'
				},
				'paidAt': 1516699996,
				'projectId': 100,
				'remark': '',
				'room': {
					'building': '一幢',
					'group': '某',
					'houseId': '6361497057362055168',
					'id': '6361497057362055170',
					'locationName': '新帝朗郡',
					'roomName': '1',
					'roomNumber': '2301',
					'status': 'IDLE',
					'unit': '1单元',
				},
				'status': 'pending',
				'user': {
					'accountName': 'f1',
					'name': 'www',
					'id': 1,
					'mobile': ''
				}
			});
		});
	});

	it('should convert topup to flows', async function () {
		const req = {
			params: {
				projectId: 100
			},
			query: {}
		};
		global.MySQL = {
			Flows: {
				async findAndCountAll() {
					return {
						count: 1,
						rows: [{
							topup: {
								dataValues: {
									'id': '6361765825690603521',
									'orderNo': '6361765825690603520',
									'userId': 1,
									'flowId': 6361765825669632000,
									'externalId': '',
									'contractId': '6361765640847626240',
									'projectId': 100,
									'amount': 123,
									'fundChannelId': 1,
									'operator': 1,
									'createdAt': '2018-01-24T03:06:08.000Z',
									'updatedAt': '2018-01-24T03:06:08.000Z',
									'deletedAt': null,
									contract: {
										user: {
											'id': 1,
											'accountName': 'f1',
											'name': 'www',
											'mobile': '',
											'documentId': '',
											'documentType': 1,
											'gender': 'M'
										},
										room: {
											dataValues: {
												'config': {},
												'id': '6361497057362055170',
												'name': '1',
												'status': 'IDLE',
												house: {
													dataValues: {
														'config': {},
														'id': '6361497057362055168',
														'roomNumber': '2301',
														building: {
															dataValues: {
																'config': {},
																'building': '一幢',
																'unit': '1单元',
																'group': '某',
																location: {
																	dataValues: {
																		'name': '新帝朗郡'
																	}
																}

															}
														}

													}
												}
											}
										},
										'id': '6361497126945558528',
										'roomId': '6361497057362055170',
										'projectId': 100,
										'from': 1513599462,
										'to': 1545135462,
										'contractNumber': '',
										'paymentPlan': 'F02',
										'signUpTime': 1513599462,
										'status': 'ONGOING',
										'actualEndDate': null,
										'createdAt': '2018-01-24T03:06:08.000Z',
										'updatedAt': '2018-01-24T03:06:08.000Z',
										'deletedAt': null,
										'userId': 1
									},
									operatorInfo: {
										'id': 1,
										'username': 'admin100'
									}
								}
							},
							dataValues: {
								'id': 6361765825669632000,
								'projectId': 100,
								'category': 'topup',
								'createdAt': '2018-01-24T03:06:08.000Z',
								'updatedAt': '2018-01-24T03:06:08.000Z',
								'deletedAt': null
							},
							billpayment: null
						}]
					};
				}
			}
		};
		const resSpy = spy();

		await get(req, {send: resSpy}).then(() => {
			resSpy.should.have.been.called;
			resSpy.getCall(0).args[0].data[0].should.be.eql({
				'amount': 123,
				'category': 'topup',
				'contract': {
					'id': '6361497126945558528',
					'from': 1513599462,
					'to': 1545135462,
					'status': 'ONGOING',
					'actualEndDate': null
				},
				'externalId': '',
				'fundChannelId': 1,
				'id': 6361765825669632000,
				'orderNo': '6361765825690603520',
				'operator': {
					'id': 1,
					'username': 'admin100'
				},
				'paidAt': 1516763168,
				'projectId': 100,
				'room': {
					'building': '一幢',
					'group': '某',
					'houseId': '6361497057362055168',
					'id': '6361497057362055170',
					'locationName': '新帝朗郡',
					'roomName': '1',
					'roomNumber': '2301',
					'status': 'IDLE',
					'unit': '1单元',
				},
				'user': {
					'accountName': 'f1',
					'name': 'www',
					'id': 1,
					'mobile': ''
				}
			});
		});
	});
});