const auth = require('./auth')
const util = require('./util.js')
const debug = require('debug')('expressa')

module.exports = function (api) {
  api.addCollectionListener(['post', 'put'], 'users', function updatePassword (req, collection, data) {
    if (data.password && data.password.length !== 60 && data.password[0] !== '$') {
      debug('hashing and replacing password in the user document.')
      data.password = auth.createHash(data.password)
    }
  })

  api.addLateCollectionListener('put', 'users', async function roleChangeCheck (req, collection, data) {
    if (!req.hasPermission('users: modify roles')) {
      const oldData = await api.db.users.get(data._id)
      data.roles = oldData.roles
    }
  })

  // TODO how to add back in the password on PUT?
  api.addCollectionListener('get', -100, function hidePasswordHashes (req, collection, data) {
    if (collection === 'users' && !req.hasPermission('users: view hashed passwords')) {
      debug('deleting password because "users: view hashed passwords"-permission is not set')
      delete data.password
    }
  })

  api.addListener('get', -5, function allowViewOwnUser (req, collection, data) {
    if (collection === 'users' && req.hasPermission('users: view own')) {
      if (req.uid === data._id) {
        return true
      }
    }
  })

  api.addCollectionListener('post', 'users', async function userUniquenessCheck (req, collection, data) {
    const result = await api.db.users.find({ email: data.email })
    if (result.length > 0) {
      throw new util.ApiError(409, 'User with this email already registered.')
    }
  })

  /* Mantain users-roles reference */
  api.addCollectionListener('changed', 'role', async function (req, collection, data) {
    const doc = await api.db.collection.get('users')
    if (!doc.schema.properties.roles.items.enum.includes(data._id)) {
      doc.schema.properties.roles.items.enum.push(data._id)
      await api.db.collection.update('users', doc)
      await api.notify('changed', req, 'users', doc)
    }
  })
  api.addCollectionListener('deleted', 'role', async function (req, collection, data) {
    const doc = await api.db.collection.get('users')
    const roles = doc.schema.properties.roles.items.enum
    if (roles.includes(data._id)) {
      roles.splice(roles.indexOf(data._id), 1)
      await api.db.collection.update('users', doc)
      await api.notify('changed', req, 'users', doc)
    }
  })
}
