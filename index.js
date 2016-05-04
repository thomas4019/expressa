var config = require('./config');
var uuid = require('node-uuid');
var express = require('express')
var fs = require('fs')

module.exports = function(settings) {
	config.settings = settings;
	if (typeof settings.secret == 'undefined') {
		try {
			settings.secret = fs.readFileSync('secret.txt', 'utf8');
		} catch (e) {
			settings.secret = uuid.v4();
			fs.writeFileSync('secret.txt', settings.secret, 'utf8');
		}
	}

	return {
		api: require('./api.js'),
		admin: function() {
			return express.static('node_modules/nbackend-admin');
		},
		adminHistoryFallback: function() {
			var router = express.Router()
			router.use('/', express.static('node_modules/nbackend-admin'));
			router.get('*', function (req, res) {
				res.sendFile(__dirname + '/node_modules/nbackend-admin/index.html')
			})
			return router;
		}
	}
};