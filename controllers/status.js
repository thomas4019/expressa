const util = require('../util')

exports.getStatus = function(router) {
  return async (req) => {
    if (!req.hasPermission('view server details')) {
      return {
        env: process.env.NODE_ENV,
        installed: req.settings.installed || false,
      }
    }
    const allListeners = [].concat.apply([], Object.values(req.eventListeners))
    const middleware = router.stack.filter((item) => !item.route).map((item) => ({
      name: item.name,
      params: util.getFunctionParamNames(item.handle),
    }))
    const uniqueListeners = [...new Set(allListeners)]
    const eventTypes = ['get', 'post', 'put', 'delete', 'changed', 'deleted']
    const listeners = uniqueListeners.map(function (listener) {
      const o = {}
      o.name = listener.name
      o.priority = listener.priority
      o.collections = listener.collections
      for (const type of eventTypes) {
        if (router.eventListeners[type].includes(listener)) {
          o[type] = true
        }
      }
      return o
    })
    listeners.sort((a, b) => a.priority - b.priority)
    const collections = Object.keys(router.db)
      .filter((collection) => req.hasPermission(`${collection}: view`) || req.hasPermission(`${collection}: view own`))
    return {
      nodeVersion: process.version,
      uptime: util.friendlyDuration(process.uptime()),
      env: process.env.NODE_ENV,
      installed: req.settings.installed || false,
      middleware,
      listeners,
      collections,
    }
  }
}
