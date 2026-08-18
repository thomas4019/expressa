const jwt = require('jsonwebtoken')

// User document already validated, created, and saved to database
// The id of that document is given.
exports.doLogin = function ({ id, collection, timestamp, jwt_secret, jwt_options = {} }) {
  if (!jwt_secret) {
    // Required lazily rather than at module scope: util.js requires ./auth,
    // which requires this module, so a top-level require here creates a cycle
    // whose outcome depends on which file happens to enter it first. util.js
    // re-exports auth.doLogin/createHash/isHashed by value at module scope, so
    // entering the cycle from auth would leave those as undefined.
    const util = require('../util')
    throw new util.ApiError(500, 'missing jwt_secret')
  }
  const token = jwt.sign({
    _id: id,
    collection,
    timestamp,
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
