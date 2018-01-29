'use strict';
const includeContracts = require('../../services/v1.0/common').includeContracts;

const Users = {id: 'Users'};
const Rooms = {id: 'Rooms'};
const Houses = {id: 'Houses'};
const Building = {id: 'Building'};
const GeoLocation = {id: 'GeoLocation'};
const Contracts = {id: 'Contracts'};

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
                                        }
                                    ],
                                    model: Building,
                                }
                            ],
                            model: Houses,
                        }
                    ],
                    required: true,
                    model: Rooms,
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
                                        }
                                    ],
                                    model: Building,
                                }
                            ],
                            model: Houses,
                        }
                    ],
                    required: true,
                    model: Rooms,
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
                    model: Users
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
                                        }
                                    ],
                                    model: Building,
                                }
                            ],
                            model: Houses,
                            where: {
                                houseFormat: 'SOLE'
                            }
                        }
                    ],
                    required: true,
                    model: Rooms,
                }
            ],
            model: Contracts
        });
    });
});