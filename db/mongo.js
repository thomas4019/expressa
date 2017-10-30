var MongoClient = require('mongodb').MongoClient
var ObjectId = require('mongodb').ObjectID

module.exports = function (settings, collection) {
  return {
    init: function () {
      if (!settings.mongodb_uri) {
        console.error(`{collection} uses mongo, but mongodb_url is undefined.`)
      }
    },
    all: function () {
      return new Promise(function (resolve, reject) {
        MongoClient.connect(settings.mongodb_uri, function (err, db) {
          if (err) {
            return reject(err)
          }
          db.collection(collection).find({})
            .toArray(function (err, docs) {
              docs.forEach(function (doc) {
                doc._id = doc._id.toString()
              })
              if (err) {
                reject(err)
              } else {
                resolve(docs)
              }
            })
        })
      })
    },
    find: function (query, skip, limit, orderby) {
      return new Promise(function (resolve, reject) {
        MongoClient.connect(settings.mongodb_uri, function (err, db) {
          if (err) {
            return reject(err)
          }
          var cursor = db.collection(collection).find(query).sort(orderby)
          if (typeof skip !== 'undefined') {
            cursor.skip(skip)
          }
          if (typeof limit !== 'undefined') {
            cursor.limit(limit)
          }
          cursor.toArray(function (err, docs) {
            docs.forEach(function (doc) {
              doc._id = doc._id.toString()
            })
            if (err) {
              reject(err)
            } else {
              resolve(docs)
            }
          })
        })
      })
    },
    get: function (id) {
      return new Promise(function (resolve, reject) {
        MongoClient.connect(settings.mongodb_uri, function (err, db) {
          if (err) {
            return reject(err)
          }
          db.collection(collection).findOne(new ObjectId(id), function (err, doc) {
            if (doc) {
              doc._id = doc._id.toString()
            }
            if (err) {
              reject(err)
            } else {
              if (doc) {
                resolve(doc)
              } else {
                reject('document not found', 404)
              }
            }
          })
        })
      })
    },
    create: function (data) {
      return new Promise(function (resolve, reject) {
        MongoClient.connect(settings.mongodb_uri, function (err, db) {
          if (err) {
            return reject(err)
          }
          db.collection(collection).insert(data, function (err, doc) {
            if (err) {
              reject(err)
            } else {
              resolve(doc.insertedIds[0])
            }
          })
        })
      })
    },
    update: function (id, data) {
      return new Promise(function (resolve, reject) {
        MongoClient.connect(settings.mongodb_uri, function (err, db) {
          if (err) {
            return reject(err)
          }
          data._id = ObjectId(id)
          db.collection(collection).update({
            _id: ObjectId(id)
          }, data, function (err, doc) {
            // doc._id = doc._id.toString()
            if (err) {
              reject(err)
            } else {
              resolve(doc)
            }
          })
        })
      })
    },
    delete: function (id) {
      return new Promise(function (resolve, reject) {
        MongoClient.connect(settings.mongodb_uri, function (err, db) {
          if (err) {
            return reject(err)
          }
          db.collection(collection).remove({
            _id: ObjectId(id)
          }, function (err, doc) {
            if (typeof doc._id !== 'undefined') {
              doc._id = doc._id.toString()
            }
            if (err) {
              reject(err)
            } else {
              resolve(doc)
            }
          })
        })
      })
    }
  }
}
