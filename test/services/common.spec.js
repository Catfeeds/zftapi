'use strict';
const includeContracts = require('../../services/v1.0/common').includeContracts;

const Users = {id: 1};
const Rooms = {id: 2};
const Houses = {id: 3};
const Building = {id: 4};
const GeoLocation = {id: 5};
const Contracts = {id: 6};

describe('Common', function () {
	before(() => {
		global.Typedef = Include('/libs/typedef');
	});
	it('should provide contracts condition', function () {
		const contractFilter = includeContracts(Contracts, Users, Houses, Building, GeoLocation, Rooms);
		const contractOptions = contractFilter('');
		contractOptions.should.be.eql({
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
			model: Contracts,
			where: {
				status: 'ONGOING'
			}
		});
	});
	it('should include terminated contracts if contract status is overridden', function () {
		const contractFilter = includeContracts(Contracts, Users, Houses, Building, GeoLocation, Rooms);
		const contractOptions = contractFilter('', {});
		contractOptions.should.be.eql({
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
		});
	});
	it('should consider houseFormat if provided', function () {
		const contractFilter = includeContracts(Contracts, Users, Houses, Building, GeoLocation, Rooms);
		const contractOptions = contractFilter('SOLE', {});
		contractOptions.should.be.eql({
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
							required: true,
							where: {
								houseFormat: 'SOLE'
							}
						}
					],
					model: Rooms,
					required: true
				}
			],
			model: Contracts
		});
	});
});