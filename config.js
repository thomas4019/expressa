module.exports = (function() {
	var url = 'postgres://thomas:334123@localhost/v5';

	return {
		getSecret: function() {
			return 'test123';
		},
		getConnectionURL: function() {
			return url;
		},
		setConnectionURL: function(u) {
			url = u;
		}
	};
})();