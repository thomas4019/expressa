var auth = require('./auth')

module.exports = function(api) {

	// Add db interface for new collections immediately
	api.addListener('changed', function setupCollections(req, collection, data) {
		if (collection == 'collection') {
			api.db[data._id] = api.dbTypes[data.storage](req.settings, data._id)
			console.log('updated ' + data._id + ' collection storage')
		}
	})

	api.addListener(['post', 'put'], function updatePassword(req, collection, data) {
		if (collection == 'users' && data.password.length != 60 && data.password[0] != "$") {
			data.password = auth.createHash(data.password);
		}
	});

	api.addListener('post', function updateMetadata(req, collection, data) {
		data.meta = data.meta || {};
		data.meta.created = new Date().toISOString();
		data.meta.updated = new Date().toISOString();
		if (req.user) {
			data.meta.owner = req.user._id;
		}
	});

	api.addListener('put', function updateMetadata(req, collection, data) {
		data.meta = data.meta || {};
		data.meta.updated = new Date().toISOString();
	});

	api.addListener('put', function roleChangeCheck(req, collection, data) {
		if (collection == 'users') {
			return new Promise(function(resolve, reject) {
				if (req.hasPermission('modify user roles')) {
					resolve(undefined)
				} else {
					api.db.users.findOne(data._id)
						.then(function(oldData) {
							data.roles = oldData.roles;
							resolve(undefined);
						}, function(err) {
							console.error('error during roleChangeCheck');
							console.error(err)
							reject(err)
						})
				}
			})
		}
	});

	// update roles in user schema
	/*addListener(['post', 'put', 'delete'], function(req, collection, data) {
		if (collection == 'role') {
			console.log(data)
		}
	});*/

	api.addListener('post', function userUniquenessCheck(req, collection, data) {
		if (collection == 'users') {
			return new Promise(function(resolve, reject) {
				api.db.users.find({'email': data.email})
					.then(function(result) {
						if (result.length > 0) {
							resolve({code: 409, message: 'User with this email already registered.'});
						} else {
							resolve(undefined)
						}
					}, function(err) {
						next(err)
					})
			});
		}
	});

};