const mongo = require('mongodb')
const MongoClient = mongo.MongoClient

module.exports = function (settings, collection) {
  return {
    init: function () {
      if (!settings.mongodb_uri) {
        console.error(`{collection} uses mongo, but mongodb_url is undefined.`)
      }
    },
    all: function () {
      return new Promise(function (resolve, reject) {
        MongoClient.connect(settings.mongodb_uri, { useNewUrlParser: true }, function (err, client) {
          const db = client.db(settings.mongodb_uri.split('/')[3])
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
        MongoClient.connect(settings.mongodb_uri, { useNewUrlParser: true }, function (err, client) {
          const db = client.db(settings.mongodb_uri.split('/')[3])
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
        MongoClient.connect(settings.mongodb_uri, { useNewUrlParser: true }, function (err, client) {
          const db = client.db(settings.mongodb_uri.split('/')[3])
          if (err) {
            return reject(err)
          }
          db.collection(collection).findOne({ _id: id }, function (err, doc) {
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
        MongoClient.connect(settings.mongodb_uri, { useNewUrlParser: true }, function (err, client) {
          const db = client.db(settings.mongodb_uri.split('/')[3])
          if (err) {
            return reject(err)
          }
          db.collection(collection).insertOne(data, function (err, doc) {
            if (err) {
              if (err.message && err.message.includes('duplicate key error')) {
                err.errCode = 409
              }
              reject(err)
            } else {
              resolve(doc.insertedId.toString())
            }
          })
        })
      })
    },
    update: function (id, data) {
      return new Promise(function (resolve, reject) {
        MongoClient.connect(settings.mongodb_uri, { useNewUrlParser: true }, function (err, client) {
          const db = client.db(settings.mongodb_uri.split('/')[3])
          if (err) {
            return reject(err)
          }
          data._id = id
          db.collection(collection).replaceOne({
            _id: id
          }, data, function (err, doc) {
            // doc._id = doc._id.toString()
            if (err) {
              reject(err)
            } else {
              resolve(data)
            }
          })
        })
      })
    },
    delete: function (id) {
      return new Promise(function (resolve, reject) {
        MongoClient.connect(settings.mongodb_uri, { useNewUrlParser: true }, function (err, client) {
          const db = client.db(settings.mongodb_uri.split('/')[3])
          if (err) {
            return reject(err)
          }
          db.collection(collection).deleteOne({
            _id: id
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
