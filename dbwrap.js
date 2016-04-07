var listeners = [];

exports.addListener = function(listener) {
	listeners.push(listener);
}

function notify(event, collection, p1, p2) {
	listeners.forEach(function(listener) {
		listener(event, collection, p1, p2)
	});
}

exports.wrap = function(db, collection) {
	return {
		init: function() {
			return db.init();
		},
		all: function(id) {
			return db.all(id);
		},
		findOne: function(id) {
			notify('findOne', collection, id);
			return db.findOne(id);
		},
		create: function(data) {
			return new Promise(function(resolve, reject) {
				db.create(data)
					.then(function(id) {
						notify('create', collection, id, data);
						resolve(id);
					}, function(err) {
						reject(err);
					});
			})
		},
		update: function(id, data) {
			var p = db.update(id, data);
			notify('update', collection, id, data);
			return p;
		},
		destroy: function(id) {
			var p = db.destroy(id);
			notify('destroy', collection, id, null);
			return p;
		}
	};
}