const auth = require('../auth')
const util = require('../util')
const collectionsApi = require('./collections')

exports.login = async (req) => {
  const password = req.body.password

  if (typeof req.body.email !== 'string') {
    throw new util.ApiError(400, 'email must be a string')
  }

  // check if user exists
  const result = await req.db.users.find({
    email: req.body.email
  })
  if (result.length === 0) {
    throw new util.ApiError(400, 'No user found with this email.')
  }
  const user = result[0]
  if (!auth.isValidPassword(password, user.password)) {
    throw new util.ApiError(401, 'Incorrect password')
  }
  return auth.doLogin(user, req)
}

exports.register = function (req) {
  req.url = '/users'
  req.params.collection = 'users'
  return collectionsApi.insert(req)
}

exports.getMe = function (req) {
  req.params.collection = 'users'
  req.params.id = req.uid
  return collectionsApi.getById(req)
}
