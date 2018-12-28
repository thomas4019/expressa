const bcrypt = require('bcryptjs')
const handler = require('./jwt')
const util = require('../util')

exports.createHash = function (password) {
  const salt = bcrypt.genSaltSync(10)
  return bcrypt.hashSync(password, salt)
}

exports.isValidPassword = function (password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword)
}

exports.doLogin = handler.doLogin

exports.middleware = util.asyncMiddleware(async (req, res, next) => {
  const user = await handler.isLoggedIn(req)
  if (user) {
    req.uid = user._id
  }
  next()
})
