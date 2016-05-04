var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var url = require('../config').settings.mongo;

module.exports = (function(collection) {
	return {
		init: function() {

		},
		all: function() {
			return new Promise(function(resolve, reject) {
				MongoClient.connect(url, function(err, db) {
					db.collection(collection).find({})
					.toArray(function(err, docs) {
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
				MongoClient.connect(url, function(err, db) {
					var cursor = db.collection(collection).find(query)
					if (typeof skip != 'undefined') {
						cursor.skip(skip)
					}
					if (typeof limit != 'undefined') {
						cursor.limit(limit)
					}
					cursor.toArray(function(err, docs) {
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
				MongoClient.connect(url, function(err, db) {
					db.collection(collection).findOne(new ObjectId(id), function(err, doc) {
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
				MongoClient.connect(url, function(err, db) {
					db.collection(collection).create(data, function(err, doc) {
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
				MongoClient.connect(url, function(err, db) {
					db.collection(collection).update({_id: ObjectId(id)}, data, function(err, doc) {
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
				MongoClient.connect(url, function(err, db) {
					db.collection(collection).remove({_id: ObjectId(id)}, function(err, doc) {
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