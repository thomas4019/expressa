var express = require('express')

module.exports = function(settings) {
	return {
		api: require('./api.js'),
		admin: function(settings) {
			if (!settings)
				return express.static('node_modules/expressa-admin');
			else {
				var router = express.Router()
				router.get('/settings.js', function(req, res) {
					res.send('window.settings = ' + JSON.stringify(settings) + ';')
				})
				router.use(express.static('node_modules/expressa-admin'))
				return router
			}
		}
	}
};
