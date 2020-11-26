module.exports = function (storage) {
  const cache = require('./memory')()

  return {
    cache: cache,
    init: async function () {
      await Promise.resolve(storage.init())
      const data = await storage.all()
      await Promise.all(data.map((doc) => cache.create(doc)))
    },
    all: function () {
      return cache.all()
    },
    find: function (query, offset, limit, orderby, fields) {
      return cache.find(query, offset, limit, orderby, fields)
    },
    get: function (id, fields) {
      return cache.get(id, fields)
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
