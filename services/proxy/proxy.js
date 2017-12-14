'use strict';

const axios = require('axios');

module.exports = {
	//TODO: fix this
	delegate(path, res, next) {
		const mockUrl = 'https://easy-mock.com/mock/5a0e5d49ec27b206e2af1c87/api';
		axios.get(`${mockUrl}${path}`)
			.then((response) => {
				console.log(response.data);
				res.send(response.data);
				next();
			})
			.catch((error) => {
				console.log(error);
			});
	}
};