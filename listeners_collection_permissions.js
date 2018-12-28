const util = require('./util')

function ensureCollectionPermission (permission) {
  return function collectionPermissionCheck (req, collection, data) {
    const editingOwnUser = collection === 'users' && data._id === req.uid
    const editingOwnDoc = data.meta && data.meta.owner && data.meta.owner === req.uid
    const editingOwn = ((editingOwnUser || editingOwnDoc) &&
      req.hasPermission(collection + ': ' + permission + ' own'))
    if (!editingOwn && !req.hasPermission(collection + ': ' + permission)) {
      throw new util.ApiError(401, 'You do not have permission to perform this action.')
    }
  }
}

function collectionPermissions (name) {
  return ['create', 'view', 'edit', 'delete'].map((action) => `${name}: ${action}`)
}

function collectionOwnerPermissions (name) {
  return ['view', 'edit', 'delete'].map((action) => `${name}: ${action} own`)
}

module.exports = function (api) {
  api.addCollectionListener('get', 'collection', function viewRelevantCollections (req, collection, data) {
    if (req.hasPermission('collection: view relevant')) {
      if (req.hasPermission(data._id + ': view') || req.hasPermission(data._id + ': view own')) {
        return true // force allow
      }
    }
  })

  api.addListener('get', ensureCollectionPermission('view'))
  api.addListener('put', ensureCollectionPermission('edit'))
  api.addListener('post', ensureCollectionPermission('create'))
  api.addListener('delete', ensureCollectionPermission('delete'))

  /* Add/remove relevant permissions from Admin role when relevant */
  api.addCollectionListener(['put', 'post'], 'collection', async (req, collection, data) => {
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
  api.addCollectionListener('delete', 'collection', async (req, collection, data) => {
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
