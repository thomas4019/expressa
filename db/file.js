const Store = require('jfs')
const debug = require('debug')('expressa')
const { promisify } = require('util')
Store.prototype.allAsync = promisify(Store.prototype.all)
Store.prototype.getAsync = promisify(Store.prototype.get)
Store.prototype.saveAsync = promisify(Store.prototype.save)

const sift = require('sift')

const util = require('../util')

module.exports = function (settings, collection) {
  const store = new Store((settings.file_storage_path || 'data') + '/' + collection, {
    pretty: true,
    saveId: '_id'
  })

  return {
    init: function () {},
    all: async function () {
      return this.find({})
    },
    find: async function (query, offset, limit, orderby, fields) {
      const data = await store.allAsync()
      const arr = Object.keys(data).map(function (id) {
        return data[id]
      })
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
      if (matches) { // prevent store from being modified
        matches = matches.map(function (m) {
          return util.clone(m)
        })
      } // prevent store from being modified
      if (fields) {
        matches = matches.map((doc) => util.mongoProject(doc, fields))
      }
      return matches
    },
    get: async function (id, fields) {
      try {
        let data = await store.getAsync(id)
        if (data) {
          data = util.clone(data) // prevent store from getting modified
        }
        if (fields) {
          data = util.mongoProject(data, fields)
        }
        return data
      } catch (err) {
        debug(collection + ' ' + id)
        throw new util.ApiError(404, 'document not found')
      }
    },
    exists: async function (id) {
      try {
        await store.getAsync(id)
        return true
      } catch (err) {
        return false
      }
    },
    create: async function (data) {
      data = util.sortObjectKeys(data)
      util.addIdIfMissing(data)
      const id = data._id
      const existing = await this.exists(id)
      if (existing) {
        throw new util.ApiError(409, 'document already exists')
      }
      await store.saveAsync(id, data)
      return id
    },
    update: async function (id, data) {
      data._id = data._id || id
      data = util.sortObjectKeys(data)
      await store.saveAsync(data._id, data)
      if (data._id !== id) {
        await store.delete(id)
      }
      return data
    },
    delete: async function (id) {
      await this.get(id) // to check if exists
      await store.delete(id)
    }
  }
}
