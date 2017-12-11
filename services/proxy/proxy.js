'use strict';

const axios = require('axios');

module.exports = {
	//TODO: fix this
	delegate(path, res, next) {
		const mockUrl = 'http://mock.doctorwork.com/mock/5a0e40653dea15470360bc0b/zft';
		axios.get(`${mockUrl}/${path}`)
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