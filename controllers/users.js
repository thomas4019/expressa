const auth = require('../auth')
const util = require('../util')
const collectionsApi = require('./collections')
const userPermissions = require('../middleware/users_permissions')

exports.login = async (req, collection) => {
  const password = req.body.password

  if (typeof req.body.email !== 'string') {
    throw new util.ApiError(400, 'email must be a string')
  }

  // check if user exists
  const result = await req.db[collection].find({
    email: req.body.email
  })
  if (result.length === 0) {
    throw new util.ApiError(400, 'No ' + collection + ' found with this email.')
  }
  const user = result[0]
  if (!auth.isValidPassword(password, user.password)) {
    throw new util.ApiError(401, 'Incorrect password')
  }
  const jwt_options = req.settings.jwt_expires_in ? { expiresIn: req.settings.jwt_expires_in } : {}
  const payload = auth.doLogin(user, req, collection, jwt_options)
  req.uid = user._id
  req.ucollection = collection
  await userPermissions.addRolePermissionsAsync(req)
  payload.canUseAdmin = req.hasPermission('login to admin')
  return payload
}

exports.register = function (req, collection) {
  req.url = `/${collection}`
  req.params.collection = collection
  return collectionsApi.insert(req)
}

exports.getMe = function (req, collection) {
  req.params.collection = collection
  req.params.id = req.uid
  return collectionsApi.getById(req)
}
