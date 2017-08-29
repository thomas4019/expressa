var dotty = require('dotty')
var randomstring = require('randomstring')
var jwt = require('jsonwebtoken')

exports.orderBy = function (data, orderby) {
  data.sort(function compare (a, b) {
    for (var i = 0; i < orderby.length; i++) {
      var ordering = orderby[i]
      var key = ordering[0]
      if (dotty.get(a, key) > dotty.get(b, key)) {
        return ordering[1]
      } else if (dotty.get(a, key) < dotty.get(b, key)) {
        return -ordering[1]
      }
    }
    return 0
  })
  return data
}

exports.clone = function (obj) {
  if (!obj) {
    return obj
  }
  return JSON.parse(JSON.stringify(obj))
}

exports.getUserWithPermissions = function (api, permissions) {
  if (typeof permissions === 'string') {
    permissions = [permissions]
  }
  var permissionsMap = {}
  permissions.forEach(function (permission) {
    permissionsMap[permission] = true
  })
  var randId = randomstring.generate(12)
  var roleName = 'role' + randId
  var user = {
    'email': 'test' + randId + '@example.com',
    'password': '123',
    'roles': [roleName]
  }
  return api.db.role.cache.create({
    '_id': roleName,
    'permissions': permissionsMap
  })
    .then(function () {
      return api.db.users.cache.create(user)
    })
    .then(function (result) {
      user._id = result
      var token = jwt.sign(user, api.settings.jwt_secret, {})
      return token
    })
}
