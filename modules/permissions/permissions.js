exports.settingSchema = {
  enforce_permissions: {
    type: 'boolean',
    description: 'Whether permissions should be checked. Only turn off if needed for testing.',
    default: true
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
    permissions: {}
  })

  app.db.role.create({
    _id: 'Anonymous',
    permissions: {
      'users: create': true
    }
  })
}

function collectionPermissions (name) {
  return ['create', 'view', 'edit', 'delete'].map((action) => `${name}: ${action}`)
}

function collectionOwnerPermissions (name) {
  return ['view', 'edit', 'delete'].map((action) => `${name}: ${action} own`)
}

exports.init = async function (api) {
  api.addCollectionListener(['put', 'post'], 'collection', async function addPerms (req, collection, data) {
    if (api.db.role) {
      const admin = await api.db.role.get('Admin')
      collectionPermissions(data._id).forEach(function (permission) {
        admin.permissions[permission] = true
      })
      collectionOwnerPermissions(data._id).forEach(function (permission) {
        delete admin.permissions[permission]
        if (data.documentsHaveOwners) {
          admin.permissions[permission] = true
        }
      })
      await api.db.role.update('Admin', admin)
    }
  })

  api.addCollectionListener('delete', 'collection', async function removePerms (req, collection, data) {
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
