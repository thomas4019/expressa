const _ = require('lodash')
const randomstring = require('randomstring')
const jwt = require('jsonwebtoken')
const debug = require('debug')('expressa')

exports.orderBy = function (data, orderby) {
  data.sort(function compare (a, b) {
    for (let i = 0; i < orderby.length; i++) {
      const ordering = orderby[i]
      const key = ordering[0]
      if (_.get(a, key) > _.get(b, key)) {
        return ordering[1]
      } else if (_.get(a, key) < _.get(b, key)) {
        return -ordering[1]
      }
    }
    return 0
  })
  return data
}

exports.normalizeOrderBy = function(orderby) {
  if (Array.isArray(orderby)) {
    orderby = orderby.map(function (ordering) {
      if (typeof ordering === 'string') {
        return [ordering, 1]
      } else if (Array.isArray(ordering)) {
        if (ordering.length === 1) {
          return [ordering[0], 1] // add 1 (default to ascending sort)
        }
      }
      return ordering
    })
  } else if (_.isObject(orderby)) {
    const arr = []
    for (const key in orderby) {
      arr.push([key, orderby[key]])
    }
    orderby = arr
  } else {
    throw exports.ApiError(400, 'orderby param must be array or object')
  }
  return orderby
}

exports.clone = function (obj) {
  if (!obj) {
    return obj
  }
  return JSON.parse(JSON.stringify(obj))
}

exports.getUserWithPermissions = async function (api, permissions) {
  if (typeof permissions === 'string') {
    permissions = [permissions]
  }
  permissions = permissions || []
  const permissionsMap = {}
  permissions.forEach(function (permission) {
    permissionsMap[permission] = true
  })
  const randId = randomstring.generate(12)
  const roleName = 'role' + randId
  const user = {
    'email': 'test' + randId + '@example.com',
    'password': '123',
    'roles': [roleName]
  }
  await api.db.role.cache.create({
    '_id': roleName,
    'permissions': permissionsMap
  })
  const result = await api.db.users.cache.create(user)
  user._id = result
  const token = jwt.sign(user, api.settings.jwt_secret, {})
  return token
}

const severities = ['critical', 'error', 'warning', 'notice', 'info', 'debug']
exports.getLogSeverity = function (status) {
  const severity = status >= 500 ? 'error'
    : status >= 400 ? 'warning'
      : status >= 300 ? 'notice'
        : status >= 200 ? 'info'
          : 'debug'
  return severity
}

exports.shouldLogRequest = function (req, res) {
  const severity = exports.getLogSeverity(res.statusCode)
  const severityLoggingIndex = severities.indexOf(req.settings.logging_level || 'warning')
  const severityIndex = severities.indexOf(severity)
  return severityIndex <= severityLoggingIndex
}

exports.createLogEntry = function (req, res) {
  const severity = exports.getLogSeverity(res.statusCode)
  return {
    severity: severity,
    user: req.user ? req.user._id : undefined,
    url: decodeURI(req.originalUrl || req.url),
    method: req.method,
    referer: req.headers['referer'],
    req: {
      ip: req.ip,
      headers: req.headers
    },
    res: {
      statusCode: res.statusCode,
      headers: res._headers
    },
    meta: {
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }
  }
}

exports.notify = async function (event, req, collection, data) {
  const listeners = req.eventListeners[event] || []
  debug('notifying ' + listeners.length + ' of ' + event)
  let result;
  for (const listener of listeners) {
    if (listener.collections && !listener.collections.includes(collection)) {
      continue // skip since it's not relevant
    }
    debug('calling ' + listener.name)
    try {
      result = result || await listener(req, collection, data)
    } catch (e) {
      // If a listener has already allowed the request, do not error
      if (!result) {
        throw e
      }
    }
  }
  return result || result === undefined
}

class ApiError extends Error {
  constructor (status, message) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
    this.status = status || this.constructor.status || 500
  }
}
exports.ApiError = ApiError

exports.asyncMiddleware = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next)
  }
