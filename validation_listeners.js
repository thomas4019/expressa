var ajv = require('ajv')({
  allErrors: true
})
var debug = require('debug')('expressa')

module.exports = function (api) {
  var schemaValidators = {}

  function addImplicitFields (schema) {
    var aSchema = JSON.parse(JSON.stringify(schema))
    aSchema.properties.meta = {
      'type': 'object'
    }
    aSchema.properties._id = {
      'type': 'string'
    }
    return aSchema
  }

  api.addListener('changed', function updateValidators (req, collection, data) {
    if (collection === 'collection') {
      var schema = addImplicitFields(data.schema)
      schemaValidators[data._id] = ajv.compile(schema)
    }
  })

  api.addListener(['put', 'post'], function checkValid (req, collection, data) {
    if (!req.settings.enforce_permissions) {
      return
    }
    var valid = schemaValidators[collection] ? schemaValidators[collection](data) : true
    if (!valid) {
      return {
        code: 500,
        message: schemaValidators[collection].errors
      }
    }
  })

  return api.db.collection.all()
    .then(function (result) {
      result.forEach(function (collection) {
        var schema = addImplicitFields(collection.schema)
        schemaValidators[collection._id] = ajv.compile(schema)
      })
      debug('validators loaded.')
    }, function (err) {
      console.error('failed to load collections for validators.')
      console.error(err)
    })
}
