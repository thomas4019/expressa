const jwt = require('jsonwebtoken')

const util = require('../util')

// User document already validated, created, and saved to database
// The id of that document is given.
exports.doLogin = function (user, req, options = {}) {
  if (!req.settings.jwt_secret) {
    throw new util.ApiError(500, 'missing jwt_secret in settings')
  }
  const token = jwt.sign({
    _id: user._id,
    email: user.email
  }, req.settings.jwt_secret, options)
  return {
    token: token,
    uid: user._id
  }
}

// Returns the user id, or false if not logged in.
exports.isLoggedIn = async function (req) {
  if (!req.settings.jwt_secret) {
    return false
  }
  req.query = req.query || {}
  const token = req.query.token || req.headers['x-access-token']
  delete req.query.token
  if (token) {
    return jwt.verify(token, req.settings.jwt_secret)
  }
  return false
}
