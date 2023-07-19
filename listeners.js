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

  api.addListener(['put', 'post'], async function updateMetadata (req, collection, data, { event }) {
    data.meta ??= {}
    data.meta.updated = new Date().toISOString()
    if (event === 'post') {
      data.meta.created = new Date().toISOString()
    }
  })

  api.addCollectionListener('get', 'schemas', function addMetaToSchema (req, collection, data) {
    const schema = data.schema
    if (!schema.properties.meta) {
      schema.properties.meta = {
        type: 'object',
        properties: {
          created: {
            type: 'string'
          },
          updated: {
            type: 'string'
          }
        }
      }
    }
    if (schema.properties.meta.propertyOrder === undefined) {
      schema.properties.meta.propertyOrder =  2000
    }
    if (data.documentsHaveOwners) {
      if (!schema.properties.meta.properties.owner) {
        schema.properties.meta.properties.owner = {
          type: 'string',
          links: [
            {
              rel: '» view owner user',
              href: '/admin/#/edit/users/{{self}}',
              class: 'comment-link'
            }
          ]
        },
        schema.properties.meta.properties.owner_collection = {
          type: 'string'
        }
      }
    }
  })
}
