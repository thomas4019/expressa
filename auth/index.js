const bcrypt = require('bcryptjs')
const handler = require('./jwt')

exports.isHashed = function (string) {
  return string && string.length === 60 && string[0] === '$'
}

exports.createHash = function (password) {
  const salt = bcrypt.genSaltSync(10)
  return bcrypt.hashSync(password, salt)
}

exports.isValidPassword = function (password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword)
}

exports.doLogin = handler.doLogin

exports.middleware = async function authMiddleware(req, res, next) {
  const key = req.query['access_key'] || req.headers['x-access-key']
  if (key) {
    if (typeof key == 'string' && req.db['access_keys']) {
      const accessKeys = await req.db['access_keys'].find({ key: { $eq: key } }, 0, 1)
      if (accessKeys && accessKeys.length > 0) {
        const accessKey = accessKeys[0]
        // check if access key is still valid
        if (accessKey.expires_at >= new Date().toISOString()) {
          let user
          try {
            user = await req.db[accessKey.user_collection].get(accessKey.user_id)
          } catch (e) {
            req.uerror = 'user no longer exists'
          }
          if (user && !req.uerror) {
            req.uid = user._id
            req.ucollection = 'users'
            req.user = user
          }
        }
      }
    } else {
      console.error('Non-string access key sent')
    }
  }

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
