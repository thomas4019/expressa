var router = require('express').Router();
var Store = require("jfs")
var queryDb = new Store("data/queries")
var pg = require('pg');
var conString = require('./config.js').getConnectionURL();

queries = queryDb.allSync();

Object.keys(queries).forEach(function(name) {
	var query = queries[name];
	router.get('/'+name, function (req, res) {

		pg.connect(conString, function(err, client, done) {
			if (err) {
				console.error(err);
			}
			//console.log(query.query);
			//console.log(req.query);
			var params = [];
			for (var i = 1; true; i++) {
				if (typeof req.query['p'+i] != 'undefined')
					params.push(req.query['p'+i]);
				else
					break;
			}
			client.query(query.query, params, function(err, result) {
				done();
				if (err) {
					return res.status(500).send(err);
				}
				//console.log(result);
		        res.send(result.rows)
	      	})
		})
	})
})

module.exports = router;