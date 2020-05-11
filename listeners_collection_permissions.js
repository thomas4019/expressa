const util = require('./util')
const debug = require('debug')('expressa')

const eventToPermissionMapping = {
  get: 'view',
  put: 'edit',
  post: 'create',
  delete: 'delete'
}

module.exports = function (api) {
  api.addCollectionListener('get', 'collection', function viewRelevantCollections (req, collection, data) {
    if (req.hasPermission('collection: view relevant')) {
      if (req.hasPermission(data._id + ': view') || req.hasPermission(data._id + ': view own')) {
        return true // force allow
      }
    }
  })

  api.addListener(['get', 'put', 'post', 'delete'], function collectionPermissionCheck (req, collection, data, info) {
    const permission = eventToPermissionMapping[info.event]
    const editingOwnUser = collection === 'users' && data._id === req.uid
    const editingOwnDoc = data.meta && data.meta.owner && data.meta.owner === req.uid
    const editingOwn = ((editingOwnUser || editingOwnDoc) &&
      req.hasPermission(collection + ': ' + permission + ' own'))
    // console.log(editingOwn + ' ' + editingOwnUser + ' ' + editingOwnDoc);
    if (!editingOwn && !req.hasPermission(collection + ': ' + permission)) {
      debug(`cancelling, missing permission "${collection}: ${permission}"`)
      throw new util.ApiError(401, 'You do not have permission to perform this action.')
    }
  })
}
