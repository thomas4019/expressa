var Store = require("jfs")
var randomstring = require("randomstring");
var dotty = require('dotty')
var filtr = require("filtr")

function orderBy(data, orderby) {
	data.sort(function compare(a, b) {
		for (var i = 0; i < orderby.length; i++) {
			var ordering = orderby[i]
			key = ordering[0]
			if (dotty.get(a, key) > dotty.get(b, key)) {
				return ordering[1]
			} else if (dotty.get(a, key) < dotty.get(b, key)) {
				return -ordering[1]
			}
		}
		return 0
	})
	return data
}

module.exports = (function(settings, collection) {
	var store = new Store('data/' + collection, {pretty: true, saveId: '_id'})

	return {
		init: function() {

		},
		all: function() {
			return new Promise(function(resolve, reject) {
				store.all(function(err, data) {
					if (err) {
						reject(err);
					} else {
						var arr = Object.keys(data).map(function(id) {
							return data[id];
						});
						resolve(arr);	
					}
				});
			});
		},
		find: function(query, offset, limit, orderby) {
			return new Promise(function(resolve, reject) {
				store.all(function(err, data) {
					if (err) {
						reject(err);
					} else {
						var filter = new filtr(query);
						var arr = Object.keys(data).map(function(id) {
							return data[id];
						});
						var matches = filter.test(arr)
						if (typeof offset != 'undefined' && typeof limit != 'undefined') {
							matches = matches.slice(offset, offset + limit)
						}
						else if (typeof offset != 'undefined') {
							matches = matches.slice(offset)
						}
						else if (typeof limit != 'undefined') {
							matches = matches.slice(0, limit)
						}
						if (orderby) {
							matches = orderBy(matches, orderby)
						}
						resolve(matches);
					}
				});
			});
		},
		get: function(id) {
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
			var id = typeof data._id == 'undefined' ? randomstring.generate(8) : data._id;
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
				store.save(data._id, data, function(err, data) {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				})
				if (data._id != id) {
					store.delete(id, function(err, data) {
						if (err) {
							console.error(err);
						}
					})
				}
			});
		},
		delete: function(id) {
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
