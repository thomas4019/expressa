var pg = require('pg')
var conString = require('../config.js').getConnectionURL();
var handler = require('./jwt')
var bCrypt = require('bcrypt-nodejs')

var createHash = function(password){
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null)
}

var isValidPassword = function(password, hashedPassword){
    return bCrypt.compareSync(password, hashedPassword)
}

exports.middleware = function(req, res, next) {
	handler.isLoggedIn(req, function(uid) {
		if (uid) {
			req.uid = uid;
			next();
		} else {
			console.log('access denied ' + req.url)
			res.status(403).send('Forbidden')
		}
	})
}

exports.registerRoute = function(req, res) {
	pg.connect(conString, function(err, client, done) {
		if (err) {
			console.error(err);
			return res.status(500).send('Server error')
		}	

		var user = req.body

		var email = user.email
		user.password = createHash(user.password)

		// check if user exists
		client.query("SELECT * FROM users WHERE data->>'email' = $1", [email], function(err, result) {
			if (err) {
				console.error(err);
				return res.status(500).send('Server error')
			}
			if (result.rowCount > 0) {
				return res.status(409).send('User with this email already registered.')
			}
			client.query('INSERT INTO users (data) VALUES ($1) RETURNING id', [req.body], function(err2, result2) {
				if (err2) {
					console.error(err2);
					return res.status(500).send('Server error')
				}
				var uid = result2.rows[0].id;
				handler.doLogin(uid, req, res)
			})
	    })
	});
}

exports.loginRoute = function(req, res) {
	pg.connect(conString, function(err, client, done) {
		if (err) {
			console.error(err);
			return res.status(500).send('Server error')
		}

		var email = req.body.email
		var password = req.body.password

		// check if user exists
		client.query("SELECT * FROM users WHERE data->>'email' = $1", [email], function(err, result) {
			if (err) {
				console.error(err);
				return res.status(500).send('Server error')
			}
			if (result.rowCount == 0) {
				return res.status(404).send('No user found with this email.')
			}
			var user = result.rows[0];
			if (isValidPassword(password, user.data.password)) {
				handler.doLogin(user.id, req, res)
			}
		})
	});
}