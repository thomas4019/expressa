var Store = require('jfs')
var randomstring = require('randomstring')
var sift = require('sift')

var util = require('../util')

module.exports = function (settings, collection) {
  var store = new Store((settings.file_storage_path || 'data') + '/' + collection, {
    pretty: true,
    saveId: '_id'
  })

  return {
    init: function () {},
    all: function () {
      return new Promise(function (resolve, reject) {
        store.all(function (err, data) {
          if (err) {
            reject(err)
          } else {
            var arr = Object.keys(data).map(function (id) {
              return data[id]
            })
            if (arr) { // prevent store from being modified
              arr = arr.map(function (m) {
                return util.clone(m)
              })
            }
            resolve(arr)
          }
        })
      })
    },
    find: function (query, offset, limit, orderby) {
      return new Promise(function (resolve, reject) {
        store.all(function (err, data) {
          if (err) {
            reject(err)
          } else {
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
            resolve(matches)
          }
        })
      })
    },
    get: function (id) {
      return new Promise(function (resolve, reject) {
        store.get(id, function (err, data) {
          if (err) {
            reject(err)
          } else {
            if (data) {
              data = util.clone(data)
            } // prevent store from getting modified
            resolve(data)
          }
        })
      })
    },
    create: function (data) {
      var id = typeof data._id === 'undefined' ? randomstring.generate(8) : data._id
      return new Promise(function (resolve, reject) {
        store.save(id, data, function (err, data) {
          if (err) {
            reject(err)
          } else {
            resolve(id)
          }
        })
      })
    },
    update: function (id, data) {
      return new Promise(function (resolve, reject) {
        store.save(data._id, data, function (err, data) {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
        if (data._id !== id) {
          store.delete(id, function (err, data) {
            if (err) {
              console.error(err)
            }
          })
        }
      })
    },
    delete: function (id) {
      return new Promise(function (resolve, reject) {
        store.delete(id, function (err, data) {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    }
  }
}
