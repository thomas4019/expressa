const util = require('../../util')

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
      'users: view own': true,
      'users: edit own': true,
      'users: delete own': true,
    }
  })

  app.db.role.create({
    _id: 'Anonymous',
    permissions: {
      'users: create': true
    }
  })
}

exports.permissions = ['users: modify roles']

function collectionPermissions (name) {
  return ['create', 'view', 'edit', 'delete'].map((action) => `${name}: ${action}`)
}

function collectionOwnerPermissions (name) {
  return ['view', 'edit', 'delete'].map((action) => `${name}: ${action} own`)
}

exports.init = async function (api) {
  api.addCollectionListener(['changed'], 'collection', async function addCollectionPerms (req, collection, data) {
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
    const userCount = (await api.db.users.find()).length
    if (userCount === 0 && !data.roles.includes('Admin')) {
      throw new util.ApiError(400, 'first user must have role Admin')
    }
    if (userCount > 0 && !req.hasPermission('users: modify roles')) {
      if (data.roles && data.roles.length > 0) {
        throw new util.ApiError(400, 'insufficient permissions to create user with roles')
      }
    }
  })
}
