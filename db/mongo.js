var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;

module.exports = (function(settings, collection) {
	return {
		init: function() {

		},
		all: function() {
			return new Promise(function(resolve, reject) {
				MongoClient.connect(settings.mongo, function(err, db) {
					db.collection(collection).find({})
					.toArray(function(err, docs) {
						docs.forEach(function(doc) {
							doc._id = doc._id.toString()
						})
						if (err) {
							reject(err);
						} else {
							resolve(docs);
						}
					})
				})
			});
		},
		find: function(query, skip, limit) {
			return new Promise(function(resolve, reject) {
				MongoClient.connect(settings.mongo, function(err, db) {
					var cursor = db.collection(collection).find(query)
					if (typeof skip != 'undefined') {
						cursor.skip(skip)
					}
					if (typeof limit != 'undefined') {
						cursor.limit(limit)
					}
					cursor.toArray(function(err, docs) {
						docs.forEach(function(doc) {
							doc._id = doc._id.toString()
						})
						if (err) {
							reject(err);
						} else {
							resolve(docs);
						}
					})
				})
			});
		},
		findOne: function(id) {
			return new Promise(function(resolve, reject) {
				MongoClient.connect(settings.mongo, function(err, db) {
					db.collection(collection).findOne(new ObjectId(id), function(err, doc) {
						if (doc)
							doc._id = doc._id.toString()
						if (err) {
							reject(err);
						} else {
							resolve(doc);
						}
					})
				})
			});
		},
		create: function(data) {
			return new Promise(function(resolve, reject) {
				MongoClient.connect(settings.mongo, function(err, db) {
					db.collection(collection).insert(data, function(err, doc) {
						if (typeof doc._id != 'undefined')
							doc._id = doc._id.toString()
						if (err) {
							reject(err);
						} else {
							resolve(doc);
						}
					})
				})
			});
		},
		update: function(id, data) {
			return new Promise(function(resolve, reject) {
				MongoClient.connect(settings.mongo, function(err, db) {
					data._id = ObjectId(id)
					db.collection(collection).update({_id: ObjectId(id)}, data, function(err, doc) {
						console.log(doc)
						//doc._id = doc._id.toString()
						if (err) {
							reject(err);
						} else {
							resolve(doc);
						}
					})
				})
			});
		},
		destroy: function(id) {
			return new Promise(function(resolve, reject) {
				MongoClient.connect(settings.mongo, function(err, db) {
					db.collection(collection).remove({_id: ObjectId(id)}, function(err, doc) {
						if (typeof doc._id != 'undefined')
							doc._id = doc._id.toString()
						if (err) {
							reject(err);
						} else {
							resolve(doc);
						}
					})
				})
			});
		}
	};
});