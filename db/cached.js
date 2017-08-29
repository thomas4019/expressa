module.exports = function (storage) {
  var cache = require('./memory')()

  return {
    cache: cache,
    init: function () {
      var result = Promise.resolve(storage.init())
      return result.then(function () {
        return storage.all()
          .then(function (data) {
            data.forEach(function (doc) {
              // TODO: if the cache is not memory, wait on the returned promise.
              cache.create(doc)
            })
          }, function (err) {
            console.error('failed to load backing data')
            console.error(err)
          })
      })
    },
    all: function () {
      return cache.all()
    },
    find: function (query, offset, limit, orderby) {
      return cache.find(query, offset, limit, orderby)
    },
    get: function (id) {
      return cache.get(id)
    },
    create: function (data) {
      cache.create(data)
      return storage.create(data)
    },
    update: function (id, data) {
      cache.update(id, data)
      return storage.update(id, data)
    },
    delete: function (id) {
      cache.delete(id)
      return storage.delete(id)
    }
  }
}
