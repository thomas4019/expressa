module.exports = (function() {

var express = require('express')
var bodyParser  = require('body-parser')
var router = express.Router()
var Store = require("jfs")
var schemaDb = new Store("data/schemas")
var auth = require('./auth')
var path = require('path')
var fs = require('fs')
var mongoQuery = require('mongo-query');
var dbwrap = require('./dbwrap');

var ajv = require('ajv')({allErrors: true});

//var store = new Store('data/collection', {pretty: true});

schemas = schemaDb.allSync();
//console.log(schemas);
schemaValidators = {};

for (var schemaName in schemas) {
	var schema = schemas[schemaName]
	//console.log('compiling ' + schemaName);
	schemaValidators[schemaName] = ajv.compile(schema)
}

router.use(bodyParser.json())

router.post('/user/register', auth.registerRoute)
router.post('/user/login', auth.loginRoute)
router.get('/user/logout', function(req, res) {
	var p = path.dirname(fs.realpathSync(__filename));
	fs.readFile(p + '/templates/logout.html', 'utf8', function(err, data) {
		res.send(data);
	});
});
router.get('/user/me', auth.middleware, function(req, res) {
	res.send(req.uid);
});

router.use(auth.middleware)

function addRolePermissions(user, roles, next) {
	var promises = roles.map(function(name) {
		return storage['role'].findOne(name)
	});
	user.permissions = user.permissions || {};
	Promise.all(promises)
		.then(function(roleDocs) {
			roleDocs.forEach(function(roleDoc) {
				for (var permission in roleDoc.permissions) {
					if (roleDoc.permissions[permission]) {
						user.permissions[permission] = true;
					}
				}
			})
			//console.log(user);
			next();
		}, function(err) {
			console.error(err);
			next();
		});
}

function hasPermission(req, name) {
	return req.user.permissions[name];
}

router.use(function(req, res, next) {
	if (typeof req.uid != 'undefined') {
		storage['users'].findOne(req.uid)
			.then(function(user) {
				req.user = user;
				addRolePermissions(user, roles, next);
				console.log(user.roles);
			}, function(err) {
				console.error(err);
				next();
			});;
	} else {
		roles = ['Anonymous'];
		var user = {
			permissions: {}
		}
		addRolePermissions(user, roles, next);
	}
})

var dbTypes = {
	file: require('./db/file.js'),
	postgres: require('./db/postgres.js'),
}

function collectionPermissions(name) {
	return [
		name + ": Create",
		name + ": View own",
		name + ": View any",
		name + ": Edit own",
		name + ": Edit any",
		name + ": Delete own",
		name + ": Delete any",
	]
}

dbwrap.addListener(function(event, collection, id, data) {
	if (collection == 'collection') {
		if (event == 'create') {
			storage[id] = dbwrap.wrap(dbTypes[data.storage](id), id);
		}

		storage['role'].findOne('Admin')
			.then(function(admin) {
				collectionPermissions(id).forEach(function(permission) {
					if (event == 'create')
						admin.permissions[permission] = true;
					if (event == 'destroy')
						admin.permissions[permission] = undefined;
				})
				storage['role'].update('Admin', admin)
					.then(function() {

					});
			});
	}

		/*var modifier = {
			$set: {
				'permissions': {}
			}
		}
		collectionPermissions(collection).forEach(function(permission) {
			modifier['$set']['permissions'][permission] = true;
		})
		storage['collection'].update(modifier)*/
});

storage = {

}
collections = new Store('data/collection').allSync();
for (var name in collections) {
	var collection = collections[name];
	storage[name] = dbwrap.wrap(dbTypes[collection.storage](name), name);
}


router.get('/:collection/schema', function (req, res) {
	storage['collection'].findOne(req.params.collection)
		.then(function(collection) {
			storage['schemas'].findOne(collection.schema)
				.then(function(schema) {
					res.send(schema);
				}, function(err, code) {
					res.status(code || 500).send(err);
				})
		}, function(err, code) {
			res.status(code || 500).send(err);
		})
	//var schema = schemaDb.getSync(req.params.schema)
	//res.send(schema)
})

router.get('/:schema/index', function (req, res) {
	storage[req.params.schema].all()
		.then(function(data) {
			res.send(data);
		}, function(err, code) {
			res.status(code || 500).send(err);
		});
})

router.get('/:schema/search', function (req, res) {
	var query = 'SELECT * FROM ' + req.params.schema;
	if (req.query.page) {
		query += ' OFFSET ' + req.query.limit * (req.query.page - 1);
	}
	if (req.query.limit) {
		query += ' LIMIT ' + req.query.limit;
	}
	if (storage[req.params.schema] == 'file') {
		res.send('not implemented');
	} else {
		client.query(query, function(err, result) {
			if (err) {
				console.error(err);
			}
	        res.send(result.rows)
      	})
	}
})

router.post('/:schema', function (req, res) {
	var data = req.body
	var valid = schemaValidators[req.params.schema](data);
	if (!valid) {
		return res.status(500).send(schemaValidators[req.params.schema].errors);
	}
	storage[req.params.schema].create(data)
		.then(function(id) {
			res.send({
				status: 'OK',
				id: id
			});
		}, function(err, code) {
			res.status(code || 500).send(err);
		});
})

router.get('/:schema/:id', function (req, res) {
	storage[req.params.schema].findOne(req.params.id)
		.then(function(data) {
			res.send(data);
		}, function(err, code) {
			res.status(code || 500).send(err);
		});
})

var update = function (req, res, successCallback) {
	var data = req.body
	var valid = schemaValidators[req.params.schema](data);
	if (!valid) {
		return res.status(500).send(schemaValidators[req.params.schema].errors);
	}
	storage[req.params.schema].update(req.params.id, data)
		.then(function(data) {
			successCallback();
		}, function(err, code) {
			res.status(code || 500).send(err);
		});
};

router.put('/:schema/:id', function(req, res) {
	update(req, res, function() {
		res.send('OK');
	});
})

router.post('/:schema/:id/update', function (req, res) {
	var modifier = req.body

	storage[req.params.schema].findOne(req.params.id)
		.then(function(doc) {
			var changes = mongoQuery(doc, {}, modifier);
			req.body = doc;
			update(req, res, function() {
				res.send(doc);
			});	
		});
})

router.delete('/:schema/:id', function (req, res) {
	storage[req.params.schema].destroy(req.params.id)
		.then(function(data) {
			res.send('OK');
		}, function(err, code) {
			res.status(code || 500).send(err);
		});
})


router.use('/query', require('./query.js'))

return router;
});