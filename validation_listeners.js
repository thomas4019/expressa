var ajv = require('ajv')({allErrors: true});

module.exports = function(api) {

	var schemaValidators = {};

	collections = new api.db.collection.all()
		.then(function(result) {
			result.forEach(function(collection) {
				var schema = collection.schema
				schema.properties.meta = {
					"type" : "object"
				}
				schema.properties._id = {
					"type" : "string"
				}
				schemaValidators[collection._id] = ajv.compile(schema)
			});
			console.log('validators loaded.')
		}, function(err) {
			console.error('failed to load collections');
			console.error(err);
		});

	api.addListener(['put', 'post'], function updateValidators(req, collection, data) {
		if (collection == 'collection') {
			var schema = data.schema
			schema.properties.meta = {
				"type" : "object"
			}
			schema.properties._id = {
				"type" : "string"
			}
			schemaValidators[data._id] = ajv.compile(schema)
		}
	})

	api.addListener(['put', 'post'], function checkValid(req, collection, data) {
		if (req.hasPermission('bypass schema validation')) {
			return;
		}
		var valid = schemaValidators[collection](data);
		if (!valid) {
			console.log({code: 500, message: JSON.stringify(schemaValidators[collection].errors)})
			return {code: 500, message: schemaValidators[collection].errors};
		}
	})
}