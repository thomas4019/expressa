const util = require('./util')

// A collection id becomes a SQL table name (postgres store) and a directory
// name (file store), interpolated directly, so it must be a safe identifier to
// prevent SQL injection and path traversal. Enforced in code (not only via the
// stored schema) so it applies to every existing deployment.
const COLLECTION_ID_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function addImplicitFields (schema) {
  schema['properties'] ??= {}
  schema['properties']['meta'] ??= { type: 'object' }
  schema['properties']['meta']['properties'] ??= {}
  schema['properties']['meta']['properties']['created'] ??= { type: 'string' }
  schema['properties']['meta']['properties']['updated'] ??= { type: 'string' }
  schema['properties']['meta']['properties']['owner'] ??= { type: 'string' }
  schema['properties']['meta']['properties']['owner_collection'] ??= { type: 'string' }
  schema['properties']['_id'] ??= { type: 'string' }
  return schema
}

module.exports = async function (api) {

  // Load all validators
  const collections = await api.db.collection.all()
  collections.forEach((collection) => {
    const schema = addImplicitFields(collection.schema)
    util.addSchema(collection._id, schema)
  })

  // Load new and update validators as necessary
  api.addCollectionListener('changed', 'collection', function updateSchemaValidators (req, collection, data) {
    const schema = addImplicitFields(data.schema)
    util.addSchema(data._id, schema)
  })

  api.addCollectionListener('get', ['collection', 'schemas'], function ensureIdAdded (req, collection, data) {
    if (data.schema) {
      data.schema = addImplicitFields(data.schema)
    }
  })

  api.addCollectionListener(['post', 'put'], 'collection', function validateCollectionId (req, collection, data) {
    if (!COLLECTION_ID_PATTERN.test(data._id || '')) {
      throw new util.ApiError(400, 'invalid collection id - must match ' + COLLECTION_ID_PATTERN)
    }
  })

  api.addListener(['put', 'post'], function matchesSchema (req, collection, data) {
    // TODO (switch to check if "installed" after install tests are done.
    if (!req.settings.enforce_permissions) {
      return
    }
    util.validateSchema(collection, data)
  })
}
