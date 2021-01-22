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

exports.middleware = async function authMiddleware(req, res, next) {
  try {
    const user = await handler.isLoggedIn(req)
    if (user) {
      req.uid = user._id
      req.ucollection = user.collection
    }
  }
  catch(e) {
    req.uerror = e.message === 'jwt expired' ? 'expired token' : 'jwt error'
  }
  next()
}
