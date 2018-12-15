const auth = require('./auth')
const util = require('./util.js')
const debug = require('debug')('expressa/' + String(__filename).replace(/.*\//, ''))

module.exports = function (api) {
  // Add db interface for new collections immediately
  api.addListener('changed', function setupCollections (req, collection, data) {
    if (collection === 'collection') {
      api.db[data._id] = api.dbTypes[data.storage](req.settings, data._id)
      debug('updated ' + data._id + ' collection storage')
    }
  })

  api.addListener(['post', 'put'], function updatePassword (req, collection, data) {
    if (collection === 'users' && data.password && data.password.length !== 60 && data.password[0] !== '$') {
      debug('hashing and replacing password in the user document.')
      data.password = auth.createHash(data.password)
    }
  })

  api.addListener('post', function updateMetadata (req, collection, data) {
    data.meta = data.meta || {}
    data.meta.created = new Date().toISOString()
    data.meta.updated = new Date().toISOString()
    if (req.user) {
      data.meta.owner = req.user._id
    }
  })

  api.addListener('put', function updateMetadata (req, collection, data) {
    data.meta = data.meta || {}
    data.meta.updated = new Date().toISOString()
  })

  api.addListener('put', async function roleChangeCheck (req, collection, data) {
    if (collection === 'users' && !req.hasPermission('users: modify roles')) {
      const oldData = await api.db.users.get(data._id)
      data.roles = oldData.roles
    }
  })

  // TODO how to add back in the password on PUT?
  api.addListener('get', -100, function hidePasswordHashes (req, collection, data) {
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

  api.addListener('post', async function userUniquenessCheck (req, collection, data) {
    if (collection === 'users') {
      const result = await api.db.users.find({ 'email': data.email })
      if (result.length > 0) {
        throw new util.ApiError(409, 'User with this email already registered.')
      }
    }
  })

  api.addListener('changed', function viewRelevantCollections (req, collection, data) {
    if (collection === 'role') {
      return api.db.collection.get('users')
        .then(function (doc) {
          if (doc.schema.properties.roles.items.enum.indexOf(data._id) === -1) {
            doc.schema.properties.roles.items.enum.push(data._id)
            api.db.collection.update('users', doc)
            api.notify('changed', req, 'users', doc)
          }
        })
    }
  })

  api.addListener('deleted', function viewRelevantCollections (req, collection, data) {
    if (collection === 'role') {
      return api.db.collection.get('users')
        .then(function (doc) {
          var roles = doc.schema.properties.roles.items.enum
          if (roles.indexOf(data._id) !== -1) {
            roles.splice(roles.indexOf(data._id), 1)
            api.db.collection.update('users', doc)
            api.notify('changed', req, 'users', doc)
          }
        })
    }
  })

  api.addListener('changed', function updateSettings (req, collection, data) {
    if (collection === 'settings') {
      // Copy and replace each attribute
      for (var attrname in data) {
        req.settings[attrname] = data[attrname]
      }
    }
  })

  api.addListener('get', function addMetaToSchema (req, collection, data) {
    if (collection === 'schemas') {
      var schema = data.schema
      schema.properties.meta = {
        'type': 'object',
        'propertyOrder': 2000,
        'properties': {
          'created': {
            'type': 'string'
          },
          'updated': {
            'type': 'string'
          }
        }
      }
      if (data.documentsHaveOwners) {
        schema.properties.meta.properties.owner = {
          'type': 'string',
          'links': [
            {
              'rel': '» view owner user',
              'href': '/admin/#/edit/users/{{self}}',
              'class': 'comment-link open-in-modal primary-text'
            }
          ]
        }
      }
    }
  })
}
