const util = require('./util')

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

  api.addListener(['put', 'post'], function matchesSchema (req, collection, data) {
    // TODO (switch to check if "installed" after install tests are done.
    if (!req.settings.enforce_permissions) {
      return
    }
    util.validateSchema(collection, data)
  })
}
