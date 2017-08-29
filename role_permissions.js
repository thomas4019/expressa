module.exports = function (api) {
  function addRolePermissionsMiddleware (req, res, next) {
    if (!req.settings || !req.settings.enforce_permissions) {
      req.hasPermission = function (permission) {
        return true
      }
      return next()
    }
    req.hasPermission = function (permission) {
      return req.user.permissions[permission]
    }
    if (typeof req.uid !== 'undefined') {
      api.db.users.get(req.uid)
        .then(function (user) {
          req.user = user
          addRolePermissions(user, (user.roles || []).concat(['Authenticated']), next)
        }, function (err) {
          next(err)
        })
    } else {
      var roles = ['Anonymous']
      req.user = {
        permissions: {}
      }
      addRolePermissions(req.user, roles, next)
    }
  }

  function addRolePermissions (user, roles, next) {
    var promises = roles.map(function (name) {
      return api.db.role.get(name)
        .then(function (result) {
          return result
        }, function (err) {
          console.log('failed to load role ' + name)
          console.error(err)
          return {
            permissions: {}
          }
        })
    })
    user.permissions = user.permissions || {}
    Promise.all(promises)
      .then(function (roleDocs) {
        roleDocs.forEach(function (roleDoc) {
          for (var permission in roleDoc.permissions) {
            if (roleDoc.permissions[permission]) {
              user.permissions[permission] = true
            }
          }
        })
        next()
      }, function (err) {
        next(err)
      })
  }

  return {
    middleware: addRolePermissionsMiddleware
  }
}
