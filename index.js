var config = require('./config.js')

module.exports = function(connectionURL) {
	config.setConnectionURL(connectionURL);
	return {
		api: require('./api.js'),
		edit: require('./edit.js')
	}
};