var jwt = require('jsonwebtoken');
var config = require('../../config.js')

// User document already validated, created, and saved to database
// The id of that document is given.
exports.doLogin = function(uid, req, res) {
	var token = jwt.sign(uid, config.settings.secret, {
		expiresIn: 7 * 24 * 60 * 60 // number is in seconds
	});
	res.send({
		token: token,
		uid: uid
	});
}

// Returns the user id, or false if not logged in.
exports.isLoggedIn = function(req, callback) {
	var token = req.query.token || req.headers['x-access-token']
	delete req.query.token
	if (token) {
		jwt.verify(token, config.settings.secret, function(err, decoded) {      
			if (err) {
				callback(false);
			} else {
				callback(decoded);
			}
		});
	} else {
		callback(false);
	}
}