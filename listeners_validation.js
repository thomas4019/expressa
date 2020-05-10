const ajv = require('ajv')({
  allErrors: true
})

const util = require('./util')
const schemaValidators = {}

function addImplicitFields (schema) {
  schema['properties'] = schema['properties'] || {}
  schema['properties']['meta'] = schema['properties']['meta'] || { type: 'object' }
  schema['properties']['_id'] = schema['properties']['_id'] || { type: 'string' }
  return schema
}

module.exports = async function (api) {

  // Load all validators
  const collections = await api.db.collection.all()
  collections.forEach((collection) => {
    const schema = addImplicitFields(collection.schema)
    schemaValidators[collection._id] = ajv.compile(schema)
  })

  // Load new and update validators as necessary
  api.addCollectionListener('changed', 'collection', function updateSchemaValidators (req, collection, data) {
    const schema = addImplicitFields(data.schema)
    schemaValidators[data._id] = ajv.compile(schema)
  })

  api.addCollectionListener('get', ['collection', 'schemas'], function ensureIdAdded (req, collection, data) {
    data.schema = addImplicitFields(data.schema)
  })

  api.addListener(['put', 'post'], function matchesSchema (req, collection, data) {
    // TODO (switch to check if "installed" after install tests are done.
    if (!req.settings.enforce_permissions) {
      return
    }
    if (!schemaValidators[collection]) {
      console.error(`missing schema validator for collection ${collection}`)
      return true
    }
    const isValid = schemaValidators[collection](data)
    if (!isValid) {
      throw new util.ApiError(400, JSON.stringify(schemaValidators[collection].errors))
    }
  })
}
