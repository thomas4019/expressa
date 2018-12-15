const Bluebird = require('bluebird')
const Store = require('jfs')
Bluebird.promisifyAll(Store.prototype)

const randomstring = require('randomstring')
const sift = require('sift')

const util = require('../util')

module.exports = function (settings, collection) {
  var store = new Store((settings.file_storage_path || 'data') + '/' + collection, {
    pretty: true,
    saveId: '_id'
  })

  return {
    init: function () {},
    all: async function () {
      return this.find({})
    },
    find: async function (query, offset, limit, orderby) {
      const data = await store.allAsync()
      var arr = Object.keys(data).map(function (id) {
        return data[id]
      })
      var matches = sift(query, arr)
      if (typeof offset !== 'undefined' && typeof limit !== 'undefined') {
        matches = matches.slice(offset, offset + limit)
      } else if (typeof offset !== 'undefined') {
        matches = matches.slice(offset)
      } else if (typeof limit !== 'undefined') {
        matches = matches.slice(0, limit)
      }
      if (orderby) {
        matches = util.orderBy(matches, orderby)
      }
      if (matches) { // prevent store from being modified
        matches = matches.map(function (m) {
          return util.clone(m)
        })
      } // prevent store from being modified
      return matches
    },
    get: async function (id) {
      try {
        let data = await store.getAsync(id)
        if (data) {
          data = util.clone(data) // prevent store from getting modified
        }
        return data
      } catch (err) {
        throw new util.ApiError(404, 'document not found')
      }
    },
    create: async function (data) {
      var id = typeof data._id === 'undefined' ? randomstring.generate(8) : data._id
      await store.saveAsync(id, data)
      return id
    },
    update: async function (id, data) {
      data._id = data._id || id
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
