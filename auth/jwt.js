var jwt = require('jsonwebtoken')

// User document already validated, created, and saved to database
// The id of that document is given.
exports.doLogin = function (user, req, res, next) {
  if (!req.settings.jwt_secret) {
    return next('missing jwt_secret in settings')
  }
  var token = jwt.sign({
    _id: user._id,
    email: user.email
  }, req.settings.jwt_secret, {})
  res.send({
    token: token,
    uid: user._id
  })
}

// Returns the user id, or false if not logged in.
exports.isLoggedIn = function (req, callback) {
  req.query = req.query || {}
  var token = req.query.token || req.headers['x-access-token']
  delete req.query.token
  if (token) {
    jwt.verify(token, req.settings.jwt_secret, function (err, decoded) {
      if (err) {
        callback(err, false)
      } else {
        callback(null, decoded)
      }
    })
  } else {
    callback(null, false)
  }
}
