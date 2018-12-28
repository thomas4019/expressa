/* eslint no-unused-vars: ["error", { "args": "none" }] */
const randomstring = require('randomstring')
const sift = require('sift')
const _ = require('lodash')

const util = require('../util')

module.exports = function (settings, collection) {
  const store = {}

  return {
    type: 'memory',
    init: async function () {},
    all: async function () {
      return this.find({})
    },
    find: async function (query, offset, limit, orderby) {
      const arr = Object.keys(store).map(function (id) {
        return store[id]
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
      return matches
    },
    get: async function (id) {
      if (!store[id]) {
        throw new util.ApiError(404, 'document not found')
      }
      return _.clone(store[id])
    },
    create: async function (data) {
      const id = typeof data._id === 'undefined' ? randomstring.generate(12) : data._id
      data['_id'] = id
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
    delete: async function (id) {
      if (store[id]) {
        delete store[id]
      } else {
        throw new util.ApiError(404, 'document not found')
      }
    }
  }
}
