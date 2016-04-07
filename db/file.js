var Store = require("jfs")
var randomstring = require("randomstring");

module.exports = (function(collection) {
	var store = new Store('data/' + collection, {pretty: true})

	return {
		init: function() {

		},
		all: function() {
			return new Promise(function(resolve, reject) {
				store.all(function(err, data) {
					if (err) {
						reject(err);
					} else {
						resolve(data);	
					}
				});
			});
		},
		findOne: function(id) {
			return new Promise(function(resolve, reject) {
				store.get(id, function(err, data) {
					if (err) {
						reject(err);
					} else {
						resolve(data);	
					}
				});
			});
		},
		create: function(data) {
			id = randomstring.generate(8);
			return new Promise(function(resolve, reject) {
				store.save(id, data, function(err, data) {
					if (err) {
						reject(err);
					} else {
						resolve(id);
					}
				})
			});
		},
		update: function(id, data) {
			return new Promise(function(resolve, reject) {
				store.save(id, data, function(err, data) {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				})
			});
		},
		destroy: function(id) {
			return new Promise(function(resolve, reject) {
				store.delete(id, function(err, data) {
					if (err) {
						reject(err);
					} else {
						resolve();
					}		
				})
			});
		}
	};
});