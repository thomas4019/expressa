const mongo = require('mongodb')
const MongoClient = mongo.MongoClient
const util = require('../util')

module.exports = function (settings, collection) {
  return {
    getClient: async function () {
      const client = await MongoClient.connect(settings.mongodb_uri, { useNewUrlParser: true })
      const db = client.db(settings.mongodb_uri.split('/')[3])
      return db
    },
    init: function () {
      if (!settings.mongodb_uri) {
        console.error('{collection} uses mongo, but mongodb_url is undefined.')
      }
    },
    all: async function () {
      return this.find({})
    },
    find: async function (query, skip, limit, orderby, fields) {
      const db = await this.getClient()
      const cursor = db.collection(collection).find(query, { fields }).sort(orderby)
      if (typeof skip !== 'undefined') {
        cursor.skip(skip)
      }
      if (typeof limit !== 'undefined') {
        cursor.limit(limit)
      }
      const docs = await cursor.toArray()
      docs.forEach((doc) => {
        if (doc._id) {
          doc._id = doc._id.toString()
        }
      })
      return docs
    },
    get: async function (id, fields) {
      const db = await this.getClient()
      const doc = await db.collection(collection).findOne({ _id: id }, { fields })
      if (doc) {
        doc._id = doc._id.toString()
      }
      if (!doc) {
        throw new util.ApiError(404, 'document not found')
      }
      return doc
    },
    create: async function (data) {
      util.addIdIfMissing(data)

      const db = await this.getClient()
      try {
        const doc = await db.collection(collection).insertOne(data)
        return doc.insertedId.toString()
      } catch (err) {
        if (err && err.message && err.message.includes('duplicate key error')) {
          throw new util.ApiError(409, 'document already exists')
        }
      }
    },
    update: async function (id, data) {
      data._id = id
      const db = await this.getClient()
      await db.collection(collection).replaceOne({
        _id: id
      }, data)
      // doc._id = doc._id.toString()
      return data
    },
    delete: async function (id) {
      const db = await this.getClient()
      const res = await db.collection(collection).deleteOne({
        _id: id
      })
      if (res.result.n !== 1) {
        throw new util.ApiError(404, 'document not found')
      }
    }
  }
}
