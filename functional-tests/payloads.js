'use strict';

const fp = require('lodash/fp');

const gen = () => prefix => `${prefix}${fp.random(1, 1000000)}`;
module.exports = {
    createHouse: () => ({
        'group': '一期/君临阁',
        'building': '一幢',
        'unit': '1单元',
        'roomNumber': fp.random(1, 1000000),
        'location': {
            'code': gen()('location'),
            'divisionId': 330102,
            'name': gen()('locationName'),
            'district': '浙江省杭州市西湖区',
            'address': '钱江路555号',
            'latitude': 120.195213,
            'longitude': 30.235099,
        },
        'layout': {
            'name': '12',
            'bedRoom': '12',
            'livingRoom': '2',
            'bathRoom': '2',
            'orientation': 'E',
            'roomArea': 40,
        },
        'houseFormat': 'SHARE',
        'code': gen()('houseCode'),
        'houseKeeper': '212231',
        'community': '121321',
        'currentFloor': 1,
        'totalFloor': 4,
        'config': [4, 3],
    }),
    createContract: roomId => ({
        roomId,
        'strategy': {
            'freq': {
                'rent': 10,
                'pattern': '6',
            },
            'bond': 222600,
        },
        'expenses': [
            {
                'configId': 2,
                'rent': 100,
                'pattern': 'withRent',
            },
            {
                'configId': 3,
                'rent': 20,
                'pattern': '1',
            },
            {
                'configId': 111,
                'rent': 100,
                'pattern': 'paidOff',
            },
            {
                'configId': 112,
                'rent': 45000,
                'pattern': 'paidOff',
            },
        ],
        'projectId': 980488114,
        'from': 1513599462,
        'to': 1545135462,
        'contractNumber': '',
        'paymentPlan': 'F02',
        'signUpTime': 1513599462,
        'user': {
            'accountName': fp.uniqueId('user'),
            'name': fp.uniqueId('name'),
            'mobile': fp.uniqueId('mobile'),
            'documentId': fp.uniqueId('documentId'),
            'documentType': 1,
            'gender': 'M',
        },
    }),
};