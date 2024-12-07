const util = require('../util')
let authenticatedRoleExists

async function addRolePermissions (req, roles) {
  const rolePermissions = await util.getEffectivePermissionsForRoles(roles, req.db)
  req.permissions ??= {}
  req.permissions = { ...req.permissions, ...rolePermissions }
}

async function doesAuthenticatedRoleExist(req) {
  if (typeof authenticatedRoleExists === 'undefined') {
    try {
      await req.db.role.get('Authenticated')
      authenticatedRoleExists = true
    } catch (e) {
      authenticatedRoleExists = false
    }
  }
  return authenticatedRoleExists
}

module.exports.addRolePermissionsAsync = async function addRolePermissionsMiddlewareAsync(req) {
  if (!req.settings || !req.settings.enforce_permissions) {
    // Use a dummy permission getter
    req.hasPermission = () => true
    return
  }
  req.hasPermission = (permission) => util.hasPermission(req.permissions, permission)
  let roles = ['Anonymous']
  const isAuthenticatedRole = await doesAuthenticatedRoleExist(req)
  if (req.uid) {
    roles = (req.user.roles || []).concat(isAuthenticatedRole ? ['Authenticated'] : [])
  } else {
    req.user = {}
  }
  await addRolePermissions(req, roles)
}

module.exports.middleware = function addRolePermissionsMiddleware (req, res, next) {
  module.exports.addRolePermissionsAsync(req).then(next).catch(next)
}
