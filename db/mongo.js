const mongo = require('mongodb')
const randomstring = require('randomstring')
const MongoClient = mongo.MongoClient
const util = require('../util')

module.exports = function (settings, collection) {
  return {
    init: function () {
      if (!settings.mongodb_uri) {
        console.error(`{collection} uses mongo, but mongodb_url is undefined.`)
      }
    },
    all: async function () {
      return await this.find({})
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
    get: async function (id) {
      const client = await MongoClient.connect(settings.mongodb_uri, { useNewUrlParser: true })
      const db = await client.db(settings.mongodb_uri.split('/')[3])
      const doc = await db.collection(collection).findOne({ _id: id })
      if (doc) {
        doc._id = doc._id.toString()
      }
      if (!doc) {
        throw new util.ApiError(404, 'document not found')
      }
      return doc
    },
    create: function (data) {
      var id = typeof data._id === 'undefined' ? randomstring.generate(12) : data._id
      data['_id'] = id
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
    update: async function (id, data) {
      data._id = id
      const client = await MongoClient.connect(settings.mongodb_uri, { useNewUrlParser: true })
      const db = await client.db(settings.mongodb_uri.split('/')[3])
      const doc = await db.collection(collection).replaceOne({
        _id: id
      }, data)
      // doc._id = doc._id.toString()
      return data
    },
    delete: async function (id) {
      const client = await MongoClient.connect(settings.mongodb_uri, { useNewUrlParser: true })
      const db = await client.db(settings.mongodb_uri.split('/')[3])
      const res = await db.collection(collection).deleteOne({
        _id: id
      })
      if (res.result.n !== 1) {
        throw new util.ApiError(404, 'document not found')
      }
    }
  }
}
