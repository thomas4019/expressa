module.exports = function (storage) {
  const cache = require('./memory')()

  return {
    cache: cache,
    init: function () {
      const result = Promise.resolve(storage.init())
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
    create: async function (data) {
      await cache.create(data)
      return storage.create(data)
    },
    update: async function (id, data) {
      await cache.update(id, data)
      return storage.update(id, data)
    },
    delete: async function (id) {
      await cache.delete(id)
      return storage.delete(id)
    }
  }
}
