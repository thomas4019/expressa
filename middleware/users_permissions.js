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

module.exports = util.asyncMiddleware(async function addRolePermissionsMiddleware (req, res, next) {
  if (!req.settings || !req.settings.permissions.enforce_permissions) {
    // Use a dummy permission getter
    req.hasPermission = () => true
    return next()
  }
  req.hasPermission = (permission) => req.user.permissions[permission]
  let roles = ['Anonymous']
  if (req.uid) {
    const user = await req.db.users.get(req.uid)
    req.user = user
    roles = (user.roles || []).concat(['Authenticated'])
  } else {
    req.user = { permissions: {} }
  }
  await addRolePermissions(req, req.user, roles)
  next()
})
