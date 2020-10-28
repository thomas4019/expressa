const bcrypt = require('bcryptjs')
const handler = require('./jwt')

exports.createHash = function (password) {
  const salt = bcrypt.genSaltSync(10)
  return bcrypt.hashSync(password, salt)
}

exports.isValidPassword = function (password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword)
}

exports.doLogin = handler.doLogin

exports.middleware = function authMiddleware(req, res, next) {
  const asyncFn = async (req, res, next) => {
    const user = await handler.isLoggedIn(req)
    if (user) {
      req.uid = user._id
    }
    next()
  }
  Promise.resolve(asyncFn(req, res, next)).catch((e) => {
    const error = e.message === 'jwt expired' ? 'expired token' : 'jwt error'
    res.status(400).send({ error })
  })
}
