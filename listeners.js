const debug = require('debug')('expressa')
const util = require('./util')

module.exports = function (api) {
  /* Listeners to avoid the need for a server restart */
  api.addCollectionListener('changed', 'collection', async function setupCollectionStorage (req, collection, data) {
    if (!(data.storage === 'memory' && util.getPath(api.db[data._id], 'type') === 'memory')) {
      await api.setupCollectionDb(data)
    }
    debug('updated ' + data._id + ' collection storage')
  })
  api.addCollectionListener('delete', 'collection', function cleanupCollectionStorage (req, collection, data) {
    delete api.db[data._id]
    debug('removed ' + data._id + ' collection storage')
  })
  api.addCollectionListener('changed', 'settings', function updateInMemorySettings (req, collection, data) {
    // TODO: only reload if current environment is updated
    Object.assign(req.settings, data)
  })

  api.addListener(['put', 'post'], function updateMetadata (req, collection, data, { event }) {
    data.meta = data.meta || {}
    data.meta.updated = new Date().toISOString()
    if (event === 'post') {
      data.meta.created = new Date().toISOString()
      if (req.user) {
        data.meta.owner = req.user._id
      }
    }
  })

  api.addCollectionListener('get', 'schemas', function addMetaToSchema (req, collection, data) {
    const schema = data.schema
    schema.properties.meta = {
      type: 'object',
      propertyOrder: 2000,
      properties: {
        created: {
          type: 'string'
        },
        updated: {
          type: 'string'
        }
      }
    }
    if (data.documentsHaveOwners) {
      schema.properties.meta.properties.owner = {
        type: 'string',
        links: [
          {
            rel: '» view owner user',
            href: '/admin/#/edit/users/{{self}}',
            class: 'comment-link'
          }
        ]
      }
    }
  })
}
