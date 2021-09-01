exports.settingSchema = {
  enforce_permissions: {
    type: 'boolean',
    description: 'Whether permissions should be checked. Only turn off if needed for testing.',
    default: true,
    format: 'checkbox',
  }
}

exports.collections = [{
  _id: 'role',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      _id: {
        type: 'string'
      },
      permissions: {
        type: 'object',
        additionalProperties: true,
        properties: {},
        description: 'list of permissions this role has'
      }
    },
    required: [
      '_id',
      'permissions'
    ]
  },
  cacheInMemory: true,
  documentsHaveOwners: false
}]

exports.install = async function (app) {
  app.db.role.create({
    _id: 'Admin',
    permissions: {}
  })

  app.db.role.create({
    _id: 'Authenticated',
    permissions: {
      'users: view own': 1,
      'users: edit own': 1,
      'users: delete own': 1,
    }
  })

  app.db.role.create({
    _id: 'Anonymous',
    permissions: {
      'users: create': 1
    }
  })
}

exports.permissions = ['users: modify roles', 'login to admin']

function collectionPermissions (name) {
  return ['create', 'view', 'edit', 'delete'].map((action) => `${name}: ${action}`)
}

function collectionOwnerPermissions (name) {
  return ['view', 'edit', 'delete'].map((action) => `${name}: ${action} own`)
}

exports.init = async function (api) {
  api.addCollectionListener(['changed'], 'collection', async function addCollectionPerms (req, collection, data) {
    if (api.db.role) {
      try {
        const admin = await api.db.role.get('Admin')
        collectionPermissions(data._id).forEach(function (permission) {
          if (admin.permissions[permission] == null) {
            admin.permissions[permission] = 1
          }
        })
        collectionOwnerPermissions(data._id).forEach(function (permission) {
          if (data.documentsHaveOwners) {
            if (admin.permissions[permission] == null) {
              admin.permissions[permission] = 1
            }
          }
          else {
            delete admin.permissions[permission]
          }
        })
        await api.db.role.update('Admin', admin)
      } catch (e) {
        // This error is expected if install is not complete
        if (api.installed || e.message !== 'document not found') {
          console.error('Error updating admin role with permissions')
          console.error(e)
          console.error(e.message)
        }
      }
    }
  })

  api.addCollectionListener('delete', 'collection', async function removeCollectionPerms (req, collection, data) {
    if (api.db.role) {
      const coll = data._id
      const admin = await api.db.role.get('Admin')
      const permissions = collectionPermissions(coll).concat(collectionOwnerPermissions(coll))
      permissions.forEach((permission) => {
        delete admin.permissions[permission]
      })
      await api.db.role.update('Admin', admin)
    }
  })

}
