const Ajv = require('ajv')
const ajv = new Ajv({
  allErrors: true,
  strict: 'log',
  strictSchema: 'log',
  validateFormats: false,
  allowUnionTypes: true,
})
ajv.addKeyword({
  keyword: 'links',
  type: 'string',
  schemaType: 'array',
})
ajv.addKeyword({
  keyword: 'media',
  type: 'string',
  schemaType: 'object',
})
ajv.addKeyword({
  keyword: 'propertyOrder',
  schemaType: 'number',
})
const formatKey = ajv.getKeyword('format')
formatKey.type = formatKey.type.concat(['array', 'boolean', 'object'])

const util = require('./util')
const schemaValidators = {}

function addImplicitFields (schema) {
  schema['properties'] = schema['properties'] || {}
  schema['properties']['meta'] = schema['properties']['meta'] || { type: 'object' }
  schema['properties']['meta']['properties'] = schema['properties']['meta']['properties'] || {}
  schema['properties']['meta']['properties']['created'] = schema['properties']['meta']['properties']['created'] ||
      { type: 'string' }
  schema['properties']['meta']['properties']['updated'] = schema['properties']['meta']['properties']['updated'] ||
      { type: 'string' }
  schema['properties']['meta']['properties']['owner'] = schema['properties']['meta']['properties']['owner'] ||
      { type: 'string' }
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
    if (data.schema) {
      data.schema = addImplicitFields(data.schema)
    }
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
      throw new util.ApiError(400, schemaValidators[collection].errors.map((err) => `${err.instancePath} ${err.message}: ${JSON.stringify(err.params)}`).join(', '))
    }
  })
}
