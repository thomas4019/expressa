const randomstring = require('randomstring')
const Filtr = require('filtr')

const util = require('../util')

module.exports = function (settings, collection) {
  var store = {}

  return {
    init: async function () {},
    all: async function () {
      return await this.find({})
    },
    find: async function (query, offset, limit, orderby) {
      var arr = Object.keys(store).map(function (id) {
        return store[id]
      })
      var filter = new Filtr(query)
      var matches = filter.test(arr)
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
      return matches
    },
    get: async function (id) {
      if (!store[id]) {
        throw new util.ApiError(404, 'document not found')
      }
      return store[id]
    },
    create: async function (data) {
      var id = typeof data._id === 'undefined' ? randomstring.generate(12) : data._id
      data['_id'] = id
      store[id] = data
      return id
    },
    update: async function (id, data) {
      data._id = data._id || id
      store[id] = data
      return data
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
