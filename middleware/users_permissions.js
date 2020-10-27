const util = require('../util')

async function addRolePermissions (req, user, roles) {
  user.permissions = user.permissions || {}
  const roleDocs = await Promise.all(roles.map((name) => req.db.role.get(name)))
  roleDocs.forEach((roleDoc) => {
    for (const permission in roleDoc.permissions) {
      if (roleDoc.permissions[permission]) {
        user.permissions[permission] = true
      }
    }
  })
}

module.exports.addRolePermissionsAsync = async function addRolePermissionsMiddlewareAsync(req) {
  if (!req.settings || !req.settings.enforce_permissions) {
    // Use a dummy permission getter
    req.hasPermission = () => true
    return
  }
  req.hasPermission = (permission) => req.user && req.user.permissions[permission]
  let roles = ['Anonymous']
  if (req.uid) {
    try {
      const user = await req.db.users.get(req.uid)
      req.user = user
      roles = (user.roles || []).concat(['Authenticated'])
    } catch (e) {
      throw new util.ApiError(404, 'User no longer exists')
    }
  } else {
    req.user = { permissions: {} }
  }
  await addRolePermissions(req, req.user, roles)
}

module.exports.middleware = function addRolePermissionsMiddleware (req, res, next) {
  module.exports.addRolePermissionsAsync(req).then(next).catch(next)
}
