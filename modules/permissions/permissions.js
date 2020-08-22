const util = require('../../util')

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
          admin.permissions[permission] = 1
        })
        collectionOwnerPermissions(data._id).forEach(function (permission) {
          delete admin.permissions[permission]
          if (data.documentsHaveOwners) {
            admin.permissions[permission] = 1
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

  // TODO (updates that are really inserting should trigger a post, not a put)
  api.addCollectionListener('post', 'users', async function allowFirstUserAsAdmin (req, collection, data) {
    if (!data.roles) {
      data.roles = []
    }

    const hasUsers = (await api.db.users.find({}, 0, 1)).length === 1
    if (!hasUsers && !data.roles.includes('Admin')) {
      throw new util.ApiError(400, 'first user must have role Admin')
    }
    if (hasUsers && !req.hasPermission('users: modify roles')) {
      if (data.roles && data.roles.length > 0) {
        throw new util.ApiError(400, 'insufficient permissions to create user with roles')
      }
    }
  })
}
