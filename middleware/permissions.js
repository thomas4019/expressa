const util = require('../util')

async function addRolePermissions (req, roles) {
  req.permissions = req.permissions || {}
  const roleDocs = await Promise.all(roles.map((name) => req.db.role.get(name)))
  roleDocs.forEach((roleDoc) => {
    for (const permission in roleDoc.permissions) {
      if (roleDoc.permissions[permission]) {
        req.permissions[permission] = true
      }
    }
  })
}

async function doesAuthenticatedRoleExist(req) {
  try {
    await req.db.role.get('Authenticated')
    return true
  } catch (e) {
    return false
  }
}

module.exports.addRolePermissionsAsync = async function addRolePermissionsMiddlewareAsync(req) {
  if (!req.settings || !req.settings.enforce_permissions) {
    // Use a dummy permission getter
    req.hasPermission = () => true
    return
  }
  req.hasPermission = (permission) => req.permissions && req.permissions[permission]
  let roles = ['Anonymous']
  const isAuthenticatedRole = await doesAuthenticatedRoleExist(req)
  if (req.uid) {
    try {
      const user = await req.db[req.ucollection].get(req.uid)
      req.user = user
      roles = (user.roles || []).concat(isAuthenticatedRole ? ['Authenticated'] : [])
    } catch (e) {
      throw new util.ApiError(404, 'User no longer exists')
    }
  } else {
    req.user = {}
  }
  await addRolePermissions(req, roles)
}

module.exports.middleware = function addRolePermissionsMiddleware (req, res, next) {
  module.exports.addRolePermissionsAsync(req).then(next).catch(next)
}
