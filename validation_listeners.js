var ajv = require('ajv')({allErrors: true});
var debug = require('debug')('expressa')

module.exports = function(api) {

	var schemaValidators = {};

	function augmentSchema(schema) {
		var aSchema = JSON.parse(JSON.stringify(schema))
		aSchema.properties.meta = {
			"type" : "object"
		}
		aSchema.properties._id = {
			"type" : "string"
		}
		return aSchema		
	}

	api.addListener(['get'], function augmentSchema(req, collection, data) {
		/*if (collection == 'collection') {
			data.schema.properties.meta = {
				"type" : "object",
				"propertyOrder": 2000
			}
		}*/
		if (collection == 'schemas') {
			data.properties.meta = {
				"type" : "object",
				"propertyOrder": 2000
			}
		}
	});

	collections = api.db.collection.all()
		.then(function(result) {
			result.forEach(function(collection) {
				var schema = augmentSchema(collection.schema)
				schemaValidators[collection._id] = ajv.compile(schema)
			});
			debug('validators loaded.')
		}, function(err) {
			console.error('failed to load collections');
			console.error(err);
		});

	api.addListener('changed', function updateValidators(req, collection, data) {
		if (collection == 'collection') {
			var schema = augmentSchema(data.schema)
			schemaValidators[data._id] = ajv.compile(schema)
		}
	})

	api.addListener(['put', 'post'], function checkValid(req, collection, data) {
		if (!req.settings.enforce_permissions) {
			return;
		}
		var valid = schemaValidators[collection](data);
		if (!valid) {
			console.log({code: 500, message: JSON.stringify(schemaValidators[collection].errors)})
			return {code: 500, message: schemaValidators[collection].errors};
		}
	})
}
