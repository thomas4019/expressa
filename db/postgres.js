var pg = require('pg')
var conString = require('../config.js').getConnectionURL()

module.exports = (function(collection) {
	return {
		init: function() {
			return new Promise(function(resolve, reject) {
				pg.connect(conString, function(err, client, done) {
					if (err) {
						reject(err, 500);
					}
					client.query('CREATE TABLE ' + collection + ' (id serial primary key, data jsonb)', function(err, result) {
						if (err) {
							return reject(err, 500);
						}
						resolve()
					})
				});
			});
		},
		all: function(id) {
			return new Promise(function(resolve, reject) {
				pg.connect(conString, function(err, client, done) {
					if (err) {
						reject(err, 500);
					}
					client.query('SELECT * FROM ' + collection, function(err, result) {
						if (err) {
							return reject(err, 500);
						}
						var out = {};
						result.rows.forEach(function(row) {
							out[row.id] = row.data;
						});
						resolve(out)
					})
				});
			});
		},
		findOne: function(id) {
			return new Promise(function(resolve, reject) {
				pg.connect(conString, function(err, client, done) {
					if (err) {
						reject(err, 500);
					}
					client.query('SELECT * FROM ' + collection + ' WHERE id = $1', [id], function(err, result) {
						if (err) {
							return reject(err, 500);
						}
						if (result.rowCount == 0) {
							return reject('document not found', 404);
						}
						resolve(result.rows[0].data)
					})
				});
			});
		},
		create: function(data) {
			return new Promise(function(resolve, reject) {
				pg.connect(conString, function(err, client, done) {
					if (err) {
						reject(err, 500);
					}
					client.query('INSERT INTO '+collection+' (data) VALUES ($1) RETURNING id;', [data], function(err, result) {
						if (err) {
							reject(err);
						}
						var id = result.rows[0].id;
						resolve(id);
					})
				});
			});
		},
		update: function(id, data) {
			return new Promise(function(resolve, reject) {
				pg.connect(conString, function(err, client, done) {
					if (err) {
						reject(err, 500);
					}
					client.query('UPDATE '+collection+' SET data=$2 WHERE id=$1', [id, data], function(err, result) {
						if (err) {
							return reject(err, 500);
						}
						if (result.rowCount == 0) {
							return reject('document not found', 404);
						}
						resolve();
					})
				});
			});
		},
		destroy: function(id) {
			return new Promise(function(resolve, reject) {
				pg.connect(conString, function(err, client, done) {
					if (err) {
						reject(err, 500);
					}
					client.query('DELETE FROM '+req.params.schema+' WHERE id=$1', [req.params.id], function(err, result) {
						if (err) {
							return reject(err, 500);
						}
						if (result.rowCount == 0) {
							return reject('document not found', 404);
						}
						resolve('OK');
					})
				});
			});
		}
	};
});