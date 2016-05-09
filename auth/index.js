var pg = require('pg')
var bCrypt = require('bcrypt-nodejs')
var handler = require('./jwt')

var createHash = function(password){
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null)
}

var isValidPassword = function(password, hashedPassword){
    return bCrypt.compareSync(password, hashedPassword)
}

module.exports = {
	createHash: createHash,
	middleware: function(req, res, next) {
		handler.isLoggedIn(req, function(uid) {
			if (uid) {
				req.uid = uid;
			}
			next();
		})
	},
	getLoginRoute: function(api) {
		return function(req, res, next) {
			var password = req.body.password

			// check if user exists
			api.db.users.find({'email': req.body.email})
				.then(function(result) {
					if (result.length == 0) {
						return res.status(404).send('No user found with this email.')
					}
					var user = result[0];
					if (isValidPassword(password, user.password)) {
						handler.doLogin(user._id, req, res, next)
					} else {
						res.status(500).send('Incorrect password')
					}
				}, next)
		}
	}
}
