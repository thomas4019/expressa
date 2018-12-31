const ajv = require('ajv')({
  allErrors: true
})
const _ = require('lodash')

const util = require('./util')
const schemaValidators = {}

function addImplicitFields (schema) {
  return _.merge({
    properties: {
      meta: { type: 'object' },
      _id: { type: 'string' }
    }
  }, schema)
}

module.exports = async function (api) {

  // Load all validators
  const collections = await api.db.collection.all()
  collections.forEach((collection) => {
    const schema = addImplicitFields(collection.schema)
    schemaValidators[collection._id] = ajv.compile(schema)
  })

  // Load new and update validators as necessary
  api.addCollectionListener('changed', 'collection', function updateValidators (req, collection, data) {
    const schema = addImplicitFields(data.schema)
    schemaValidators[data._id] = ajv.compile(schema)
  })

  // Load new and update validators as necessary
  api.addCollectionListener('get', ['collection', 'schemas'], function updateValidators (req, collection, data) {
    data.schema = addImplicitFields(data.schema)
  })

  api.addListener(['put', 'post'], function checkValid (req, collection, data) {
    // TODO (switch to check if "installed" after install tests are done.
    if (!req.settings.permissions.enforce_permissions) {
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
