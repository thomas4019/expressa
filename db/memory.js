/* eslint no-unused-vars: ["error", { "args": "none" }] */
const sift = require('sift')

const util = require('../util')

module.exports = function (settings, collection) {
  const store = {}

  return {
    type: 'memory',
    init: async function () {},
    all: async function () {
      return this.find({})
    },
    find: async function (query, offset, limit, orderby, fields) {
      const arr = Object.values(store)
      let matches = sift(query || {}, arr)
      if (orderby) {
        matches = util.orderBy(matches, orderby)
      }
      if (typeof offset !== 'undefined' && typeof limit !== 'undefined') {
        matches = matches.slice(offset, offset + limit)
      } else if (typeof offset !== 'undefined') {
        matches = matches.slice(offset)
      } else if (typeof limit !== 'undefined') {
        matches = matches.slice(0, limit)
      }
      if (fields) {
        matches = matches.map((doc) => util.mongoProject(doc, fields))
      }
      return matches
    },
    count: async function(...params) {
      return (await this.find(...params)).length
    },
    get: async function (id, fields) {
      if (!store[id]) {
        throw new util.ApiError(404, 'document not found')
      }
      let doc = util.clone(store[id])
      if (fields) {
        doc = util.mongoProject(doc, fields)
      }
      return doc
    },
    create: async function (data) {
      util.addIdIfMissing(data)
      const id = data._id
      if (store[id]) {
        throw new util.ApiError(409, 'document already exists')
      }
      store[id] = data
      return id
    },
    update: async function (id, data) {
      data._id = data._id || id
      store[id] = data
      return data
    },
    // Designed to match Mongo
    // https://docs.mongodb.com/manual/reference/method/db.collection.updateMany/
    updateWithQuery: async function (query, update, options) {
      const arr = Object.keys(store).map((id) => ({ _id: id, ...store[id]}) )
      const matches = sift(query || {}, arr)
      matches.forEach((doc) => {
        util.mongoUpdate(doc, update)
        store[doc._id] = doc
      })
      return {
        matchedCount: matches.length
      }
    },
    delete: async function (id) {
      if (store[id]) {
        delete store[id]
      } else {
        throw new util.ApiError(404, 'document not found')
      }
    }
  }
}
