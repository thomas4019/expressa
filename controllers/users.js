const crypto = require('crypto')
const auth = require('../auth')
const util = require('../util')
const collectionsApi = require('./collections')
const permissions = require('../middleware/permissions')

// A valid bcrypt hash of a random value. When no user matches the email we
// still compare the supplied password against this, so the response takes the
// same time whether or not the email is registered (no timing oracle).
const DUMMY_PASSWORD_HASH = auth.createHash(crypto.randomBytes(32).toString('hex'))

exports.login = async (req, collection) => {
  const password = req.body.password

  if (typeof req.body.email !== 'string') {
    throw new util.ApiError(400, 'email must be a string')
  }

  req.body.email = req.body.email.toLowerCase()

  const result = await req.db[collection].find({
    email: req.body.email
  })
  const user = result[0]
  // Always run one password comparison, and return the same error for an
  // unknown email and a wrong password, so the endpoint does not reveal which
  // emails are registered (via the message or the response timing).
  const candidate = typeof password === 'string' ? password : ''
  const passwordMatches = auth.isValidPassword(candidate, user ? user.password : DUMMY_PASSWORD_HASH)
  if (!user || !passwordMatches) {
    throw new util.ApiError(401, 'Invalid email or password')
  }
  const jwt_options = req.settings.jwt_expires_in ? { expiresIn: req.settings.jwt_expires_in } : {}
  const payload = auth.doLogin({
    id: user._id,
    collection,
    timestamp: user.meta.password_last_updated_at,
    jwt_secret: req.getSetting('jwt_secret'),
    jwt_options
  })
  req.uid = user._id
  req.ucollection = collection
  req.user = user
  await permissions.addRolePermissionsAsync(req)
  payload.canUseAdmin = req.hasPermission('login to admin')
  return payload
}

exports.register = function (req, collection) {
  req.url = `/${collection}`
  req.params.collection = collection
  return collectionsApi.insert(req)
}

exports.getMe = function (req, collection) {
  // Unauthenticated (no/invalid/expired token): req.uid is undefined, so
  // return "not found" rather than letting it fail getById's id validation.
  if (!req.uid) {
    throw new util.ApiError(404, 'document not found')
  }
  req.params.collection = collection
  req.params.id = req.uid
  return collectionsApi.getById(req)
}
