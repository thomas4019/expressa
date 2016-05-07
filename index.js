var express = require('express')

module.exports = function(settings) {
	return {
		api: require('./api.js'),
		admin: function() {
			return express.static('node_modules/expressa-admin');
		}
	}
};
