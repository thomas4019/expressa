module.exports = (function() {

var express = require('express')
var bodyParser  = require('body-parser')
var router = express.Router()
var Store = require("jfs")
var schemaDb = new Store("data/schemas")
var pg = require('pg')
var conString = require('./config.js').getConnectionURL()
var auth = require('./auth')
var path = require('path')
var fs = require('fs')
var mongoQuery = require('mongo-query');
var randomstring = require("randomstring");

var ajv = require('ajv')({allErrors: true});

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


//router.use(auth.middleware)

storage = {
	post: 'postgres',
	role: 'file',
	users: 'postgres',
	schemas: 'file',
	collection: 'file'
}
fileDbs = {

}
for (schema in storage) {
	if (storage[schema] == 'file') {
		fileDbs[schema] = new Store('data/' + schema, {pretty: true})
	}
}

pg.connect(conString, function(err, client, done) {
	if (err) {
		console.error(err);
	}

	router.get('/:schema/schema', function (req, res) {
		var schema = schemaDb.getSync(req.params.schema)
		res.send(schema)
	})

	router.get('/:schema/index', function (req, res) {
		if (storage[req.params.schema] == 'file') {
			fileDbs[req.params.schema].all(function(err, data) {
				res.send(data);
			})
		} else {
			client.query('SELECT * FROM ' + req.params.schema, function(err, result) {
				var out = {};
				result.rows.forEach(function(row) {
					out[row.id] = row.data;
				});
				res.send(out)
			})
		}
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
		if (storage[req.params.schema] == 'file') {
			var id = randomstring.generate(8);
			fileDbs[req.params.schema].save(id, data, function(err, data) {
				if (err) {
					res.status(500).send(err);
				} else {
					res.send({
						status: 'OK',
						id: id
					});
				}
			})
		} else {
			client.query('INSERT INTO '+req.params.schema+' (data) VALUES ($1) RETURNING id;', [data], function(err, result) {
				if (err) {
					console.error(err);
				}
				var id = result.rows[0].id;
				res.send({
					status: 'OK',
					id: id
				})
			})
		}
		
	})

	router.get('/:schema/:id', function (req, res) {
		if (storage[req.params.schema] == 'file') {
			fileDbs[req.params.schema].get(req.params.id, function(err, data) {
				res.send(data);
			})
		} else {
			client.query('SELECT * FROM ' + req.params.schema + ' WHERE id = $1', [req.params.id], function(err, result) {
				if (err) {
					return res.status(500).send(err);
				}
				if (result.rowCount == 0) {
					return res.status(404).send('document not found');
				}
		        res.send(result.rows[0].data)
	      	})
		}
	})

	var update = function (req, res, successCallback) {
		var data = req.body
		var valid = schemaValidators[req.params.schema](data);
		if (!valid) {
			return res.status(500).send(schemaValidators[req.params.schema].errors);
		}
		if (storage[req.params.schema] == 'file') {
			fileDbs[req.params.schema].save(req.params.id, data, function(err, data) {
				if (err) {
					res.status(500).send(err);
				} else {
					res.send('OK');
				}
			})
		} else {
			client.query('UPDATE '+req.params.schema+' SET data=$2 WHERE id=$1', [req.params.id, data], function(err, result) {
				if (err) {
					return res.status(500).send(err);
				}
				if (result.rowCount == 0) {
					return res.status(404).send('document not found');
				}
				successCallback();
			})
		}
	};

	router.put('/:schema/:id', function(req, res) {
		update(req, res, function() {
			res.send('OK');
		});
	})

	router.post('/:schema/:id/update', function (req, res) {
		var modifier = req.body

		if (storage[req.params.schema] == 'file') {
			// TODO
			res.send('TODO');
		} else {
			client.query('SELECT * FROM ' + req.params.schema + ' WHERE id = $1', [req.params.id], function(err, result) {
				if (err) {
					return res.status(500).send(err);
				}
				if (result.rowCount == 0) {
					return res.status(404).send('document not found');
				}
				var doc = result.rows[0].data

				var changes = mongoQuery(doc, {}, modifier);

				req.body = doc;

				update(req, res, function() {
					res.send(doc);
				});	
			})
		}
	})
	
	router.delete('/:schema/:id', function (req, res) {
		if (storage[req.params.schema] == 'file') {
			fileDbs[req.params.schema].delete(req.params.id, function(err, data) {
				if (err) {
					res.status(500).send(err);
				} else {
					res.send('OK');
				}			
			})
		} else {
			client.query('DELETE FROM '+req.params.schema+' WHERE id=$1', [req.params.id], function(err, result) {
				if (err) {
					return res.status(500).send(err);
				}
				if (result.rowCount == 0) {
					return res.status(404).send('document not found');
				}
				res.send('OK')
			})
		}
	})

})

router.use('/query', require('./query.js'))

return router;
});