const jwt = require('jsonwebtoken')

const util = require('../util')

// User document already validated, created, and saved to database
// The id of that document is given.
exports.doLogin = function (id, collection, jwt_secret, jwt_options = {}) {
  if (!jwt_secret) {
    throw new util.ApiError(500, 'missing jwt_secret')
  }
  const token = jwt.sign({
    _id: id,
    collection
  }, jwt_secret, jwt_options)
  return {
    token: token,
    uid: id
  }
}

// Returns the user id, or false if not logged in.
exports.isLoggedIn = async function (token, jwt_secret) {
  if (!jwt_secret) {
    return false
  }
  if (token) {
    return jwt.verify(token, jwt_secret)
  }
  return false
}
