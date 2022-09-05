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

exports.middleware = async function authMiddleware(req, res, next) {
  req.query = req.query || {}
  const token = req.query['token'] || req.headers['x-access-token']
  delete req.query['token']
  delete req.headers['x-access-token']
  let payload
  try {
    payload = await handler.isLoggedIn(token, req.getSetting('jwt_secret'))
  }
  catch(e) {
    req.uerror = e.message
  }
  if (payload) {
    let user
    try {
      user = await req.db[payload.collection].get(payload._id)
    } catch (e) {
      req.uerror = 'user no longer exists'
    }
    if (user) {
      if (req.getSetting('jwt_expire_on_password_change') && user.meta.password_last_updated_at !== payload.timestamp) {
        req.uerror = 'jwt expired'
      }
      if (!req.uerror) {
        req.uid = payload._id
        req.ucollection = payload.collection
        req.user = user
      }
    }
  }
  next()
}
