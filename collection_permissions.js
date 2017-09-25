module.exports = function (api) {
  function collectionPermissions (name) {
    return [
      name + ': create',
      name + ': view',
      name + ': edit',
      name + ': delete'
    ]
  }

  function collectionOwnerPermissions (name) {
    return [
      name + ': view own',
      name + ': edit own',
      name + ': delete own'
    ]
  }

  api.addListener('get', function viewRelevantCollections (req, collection, data) {
    if (collection === 'collection') {
      if (req.hasPermission('collection: view relevant')) {
        if (req.hasPermission(data._id + ': view') || req.hasPermission(data._id + ': view own')) {
          return true
        }
      }
    }
  })

  function ensureCollectionPermission (permission) {
    return function collectionPermissionCheck (req, collection, data) {
      var editingOwnUser = collection === 'users' && data._id === req.uid
      var editingOwnDoc = data.meta && data.meta.owner && data.meta.owner === req.uid
      var editingOwn = ((editingOwnUser || editingOwnDoc) &&
      req.hasPermission(collection + ': ' + permission + ' own'))
      if (!editingOwn && !req.hasPermission(collection + ': ' + permission)) {
        console.log('cancelling, missing permission for "' + collection + '"-collection: ' + permission)
        return {
          code: 401,
          message: 'You do not have permission to perform this action.'
        }
      }
    }
  }

  api.addListener('get', ensureCollectionPermission('view'))
  api.addListener('put', ensureCollectionPermission('edit'))
  api.addListener('post', ensureCollectionPermission('create'))
  api.addListener('delete', ensureCollectionPermission('delete'))

  function addCollectionPermissions (req, collection, data) {
    if (collection === 'collection' && api.db.role) {
      return api.db.role.get('Admin')
        .then(function (admin) {
          console.log('adding collection permissions for ' + data._id)
          collectionPermissions(data._id).forEach(function (permission) {
            admin.permissions[permission] = true
          })
          collectionOwnerPermissions(data._id).forEach(function (permission) {
            if (data.documentsHaveOwners) {
              admin.permissions[permission] = true
            } else {
              admin.permissions[permission] = undefined
            }
          })
          return api.db.role.update('Admin', admin)
        }, function (err) {
          console.error('error adding collection permissions')
          console.error(err)
        })
    }
  }
  api.addListener(['put', 'post'], addCollectionPermissions)

  function removeCollectionPermissions (req, collection, data) {
    if (collection === 'collection') {
      api.db.role.get('Admin')
        .then(function (admin) {
          console.log('deleting collection permissions for ' + data._id)
          collectionPermissions(data._id).forEach(function (permission) {
            admin.permissions[permission] = undefined
          })
          collectionOwnerPermissions(data._id).forEach(function (permission) {
            admin.permissions[permission] = undefined
          })
          api.db.role.update('Admin', admin)
            .then(function () {})
        }, function (err) {
          console.error('error removing collection permissions')
          console.error(err)
        })
    }
  }
  api.addListener('delete', removeCollectionPermissions)
}
