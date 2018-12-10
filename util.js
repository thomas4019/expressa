const dotty = require('dotty')
const randomstring = require('randomstring')
const jwt = require('jsonwebtoken')
const Bluebird = require('bluebird')
const debug = require('debug')('expressa')

exports.orderBy = function (data, orderby) {
  data.sort(function compare (a, b) {
    for (var i = 0; i < orderby.length; i++) {
      var ordering = orderby[i]
      var key = ordering[0]
      if (dotty.get(a, key) > dotty.get(b, key)) {
        return ordering[1]
      } else if (dotty.get(a, key) < dotty.get(b, key)) {
        return -ordering[1]
      }
    }
    return 0
  })
  return data
}

exports.clone = function (obj) {
  if (!obj) {
    return obj
  }
  return JSON.parse(JSON.stringify(obj))
}

exports.getUserWithPermissions = function (api, permissions) {
  if (typeof permissions === 'string') {
    permissions = [permissions]
  }
  var permissionsMap = {}
  permissions.forEach(function (permission) {
    permissionsMap[permission] = true
  })
  var randId = randomstring.generate(12)
  var roleName = 'role' + randId
  var user = {
    'email': 'test' + randId + '@example.com',
    'password': '123',
    'roles': [roleName]
  }
  return api.db.role.cache.create({
    '_id': roleName,
    'permissions': permissionsMap
  })
    .then(function () {
      return api.db.users.cache.create(user)
    })
    .then(function (result) {
      user._id = result
      var token = jwt.sign(user, api.settings.jwt_secret, {})
      return token
    })
}

const severities = ['critical', 'error', 'warning', 'notice', 'info', 'debug']
exports.getLogSeverity = function (status) {
  var severity = status >= 500 ? 'error'
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
  if (typeof req.eventListeners[event] === 'undefined' || req.eventListeners[event].length === 0) {
    return Promise.resolve(true)
  }
  debug('notifying ' + req.eventListeners[event].length + ' of ' + event)
  const results = await Bluebird.map(req.eventListeners[event], function (listener) {
    debug('calling ' + listener.name + ' ' + listener.toString())
    try {
      return listener(req, collection, data)
    } catch (e) {
      console.error('error in listener')
      console.error(e.stack)
    }
  })
  debug('results ' + results)
  // Result is the first defined value
  const result = results.reduce(function (prev, current) {
    return (prev === undefined) ? current : prev
  })
  return result || result === undefined
}
