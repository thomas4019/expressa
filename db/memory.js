var randomstring = require('randomstring')
var filtr = require('filtr')

var util = require('../util')

module.exports = function (settings, collection) {
  var store = {}

  return {
    init: function () {},
    all: function () {
      var arr = Object.keys(store).map(function (id) {
        return store[id]
      })
      return Promise.resolve(arr)
    },
    find: function (query, offset, limit, orderby) {
      var arr = Object.keys(store).map(function (id) {
        return store[id]
      })
      var filter = filtr(query)
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
      return Promise.resolve(matches)
    },
    get: function (id) {
      if (store[id]) {
        return Promise.resolve(store[id])
      } else {
        return Promise.reject('document not found', 404)
      }
    },
    create: function (data) {
      var id = typeof data._id === 'undefined' ? randomstring.generate(8) : data._id
      data['_id'] = id
      store[id] = data
      return Promise.resolve(id)
    },
    update: function (id, data) {
      store[id] = data
      return Promise.resolve()
    },
    delete: function (id) {
      if (store[id]) {
        delete store[id]
        return Promise.resolve()
      } else {
        return Promise.reject('document not found', 404)
      }
    }
  }
}
