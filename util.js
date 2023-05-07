const randomstring = require('randomstring')
const {v4} = require('uuid')
const debug = require('debug')('expressa')
const crypto = require('crypto')
const pg = require('pg')
const pgPools = {}
const dot = require('dot-object')
const mongoQuery = require('mongo-query')
const Ajv = require('ajv')
const ajv = new Ajv({
  allErrors: true,
  strict: 'log',
  strictSchema: 'log',
  validateFormats: false,
  allowUnionTypes: true,
})
ajv.addKeyword({
  keyword: 'links',
  type: 'string',
  schemaType: 'array',
})
ajv.addKeyword({
  keyword: 'media',
  type: 'string',
  schemaType: 'object',
})
ajv.addKeyword({
  keyword: 'propertyOrder',
  schemaType: 'number',
})
const formatKey = ajv.getKeyword('format')
formatKey.type = formatKey.type.concat(['array', 'boolean', 'object'])

const schemaValidators = {}

exports.addSchemaValidator = function(collection, schema) {
  schemaValidators[collection] = ajv.compile(schema)
}

exports.validateSchema = function(collection, doc) {
  if (!schemaValidators[collection]) {
    console.error(`missing schema validator for collection ${collection}`)
    return true
  }
  const isValid = schemaValidators[collection](doc)
  if (!isValid) {
    throw new ApiError(400, schemaValidators[collection].errors.map((err) => `${err.instancePath} ${err.message}: ${JSON.stringify(err.params)}`).join(', '))
  }
  return true
}

exports.orderBy = function (data, orderby) {
  data.sort(function compare (a, b) {
    for (let i = 0; i < orderby.length; i++) {
      const ordering = orderby[i]
      const key = ordering[0]
      if (exports.getPath(a, key) > exports.getPath(b, key)) {
        return ordering[1]
      } else if (exports.getPath(a, key) < exports.getPath(b, key)) {
        return -ordering[1]
      }
    }
    return 0
  })
  return data
}

exports.getArrayPaths = function (key, value) {
  if (!value)
    return []
  if (value.type === 'array')
    return [key].concat(exports.getArrayPaths(key, value.items)).filter(el => el)
  if (value.type === 'object') {
    return Object.entries(value.properties)
      .map(([key2, value]) => {
        return exports.getArrayPaths(key ? key + '.' + key2 : key2, value)
      })
      .flat()
      .filter(el => el)
  }
}

function isObject(obj) {
  return typeof obj === 'object'
}

/**
 * Returns an excerpt of the selected document based on an include projection.
 *
 * Note:
 * It includes the fields listed in the projection with a value of 1. the
 * unknown fields or the fields with a value other than 1 are ignored.
 * @param {Object}          the selected document,
 * @param {Object}          the projection to apply,
 */
function _include(obj, source) {
  const data = {}
  for (const prop in source) {
    if (typeof obj[prop] !== 'undefined') {
      if (isObject(source[prop])) {
        if (Array.isArray(obj[prop])) {
          data[prop] = obj[prop].map((element) => _include(element, source[prop]))
        } else {
          data[prop] = _include(obj[prop], source[prop])
        }
      } else if (source[prop] == 1) {
        if (isObject(obj[prop])) {
          data[prop] = exports.clone(obj[prop])
        } else if (typeof obj[prop] !== 'undefined') {
          data[prop] = obj[prop]
        }
      }
    }
  }
  return data
}

/**
 * Returns an excerpt of the selected document based on an exclude projection.
 *
 * Note:
 * It excludes the fields listed in the projection with a value of 0. The
 * unspecified fields are kept.
 */
function _exclude(obj, source) {
  const data = {}
  for (const prop in obj) {
    if (source[prop] !== undefined && !source[prop]) {
      if (isObject(source[prop])) {
        data[prop] = {}
        _exclude(obj[prop], source[prop], data[prop])
      }
    } else if (isObject(obj[prop])) {
      data[prop] = exports.clone(obj[prop])
    } else {
      data[prop] = obj[prop]
    }
  }
  return data
}

exports.mongoProject = function(record, projection) {
  if (!projection || Object.keys(projection).length < 1) {
    return record
  }
  const isInclude = projection[Object.keys(projection)[0]]
  if (typeof projection._id === 'undefined') {
    projection = {...projection, _id: 1}
  }
  const expanded = dot.object(projection)
  const result = isInclude ? _include(record, expanded) : _exclude(record, expanded)
  return result
}

exports.mongoUpdate = function(doc, update) {
  return mongoQuery(doc, {}, update)
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
  } else if (typeof orderby === 'object') {
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

exports.getPath = (obj, path, defaultValue) => {
  const result = String.prototype.split.call(path, /[,[\].]+?/)
    .filter(Boolean)
    .reduce((res, key) => (res !== null && res !== undefined) ? res[key] : res, obj)
  return (result === undefined || result === obj) ? defaultValue : result
}

exports.castArray = function(arr) {
  return Array.isArray(arr) ? arr : [arr]
}

exports.clone = function (obj) {
  if (!obj) {
    return obj
  }
  return JSON.parse(JSON.stringify(obj))
}

exports.createSecureRandomId = function() {
  return crypto.randomBytes(24).toString('hex')
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
  const now = new Date().toISOString()
  const user = {
    email: 'test' + randId + '@example.com',
    password: '123',
    collection: 'users',
    roles: [roleName],
    meta: {
      created: now,
      updated: now,
      password_last_updated_at: now,
    }
  }
  await api.db.role.cache.create({
    _id: roleName,
    permissions: permissionsMap
  })
  const result = await api.db.users.create(user)
  user._id = result
  const payload = api.util.doLogin({
    id: user._id,
    collection: 'users',
    timestamp: user.meta.password_last_updated_at,
    jwt_secret: api.settings.jwt_secret,
  })
  return payload.token
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
  const severityLoggingIndex = severities.indexOf(req.getSetting('logging_level') || 'warning')
  const severityIndex = severities.indexOf(severity)
  return severityIndex <= severityLoggingIndex
}

function filterHeaders(req) {
  const headers = req.headers || {}
  return {
    'user-agent': headers['user-agent'],
    origin: headers['origin'],
    referer: headers['referer'],
  }
}

exports.createLogEntry = function (req, res) {
  const severity = exports.getLogSeverity(res.statusCode)
  return {
    severity: severity,
    user: req.uid,
    user_collection: req.ucollection,
    url: decodeURI(req.originalUrl || req.url),
    method: req.method,
    referer: req.headers['referer'],
    req: {
      ip: req.ip,
      headers: filterHeaders(req),
    },
    res: {
      statusCode: res.statusCode,
      requestId: res.getHeader('x-request-id'),
      headers: res.getHeaders(),
      message: req.returnedError ? req.returnedError.result || req.returnedError.message : undefined,
      tokenMessage: req.uerror,
    },
    meta: {
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    },
  }
}

exports.notify = async function (event, req, collection, data) {
  const listeners = req.eventListeners[event] || []
  debug('notifying ' + listeners.length + ' of ' + event + ' for ' + collection)
  let result
  for (const listener of listeners) {
    if (listener.collections && !listener.collections.includes(collection)) {
      continue // skip since it's not relevant
    }
    debug('calling ' + listener.name + ' ' + (result ? '(skipped)' : ''))
    try {
      result = result || await listener(req, collection, data, { event })
    } catch (e) {
      if (e && e.message) {
        console.error(e)
      }
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

exports.resolve = async function resolve (handler, app) {
  if (typeof handler === 'function') {
    return handler(app)
  }
  return handler
}

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg
const ARGUMENT_NAMES = /([^\s,]+)/g
exports.getFunctionParamNames = function getFunctionParamNames (func) {
  const fnStr = func.toString().replace(STRIP_COMMENTS, '')
  let result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES)
  if(result === null)
    result = []
  return result
}

exports.friendlyDuration = function friendlyDuration (seconds) {
  if (seconds > 86400) {
    return Math.round(seconds / 86400) + ' hours'
  }
  if (seconds > 3600) {
    return Math.round(seconds / 3600) + ' hours'
  }
  if (seconds > 60) {
    return Math.round(seconds / 60) + ' minutes'
  }
  return Math.round(seconds) + ' seconds'
}

exports.getPgPool = function getPgPool(connectionString) {
  if (!pgPools[connectionString]) {
    pgPools[connectionString] = new pg.Pool({ connectionString: connectionString })
  }
  return pgPools[connectionString]
}

exports.generateDocumentId = function generateDocumentId() {
  return v4()
}

exports.addIdIfMissing = function addIdIfMissing (document) {
  if (!document._id) {
    document._id = exports.generateDocumentId()
  }
}

exports.sortObjectKeys = function sortObjectKeys(object) {
  if (typeof object != 'object' || object instanceof Array) { // Do not sort the array
    return object
  }
  const keys = Object.keys(object)
  keys.sort()
  const newObject = {}
  for (let i = 0; i < keys.length; i++){
    newObject[keys[i]] = exports.sortObjectKeys(object[keys[i]])
  }
  return newObject
}

exports.getLoginCollections = async function(api) {
  const all = await api.db.collection.all()
  return all.length > 0 ? all.filter((coll) => isValidLoginCollection(coll)) : [{
    _id: 'users',
    enableLogin: true
  }]
}

// really being over cautious here to prevent collections
// unkowingly creating insecure access to database
function isValidLoginCollection(collection) {
  const name = collection._id
  if(collection.enableLogin === true) {
    const properties = collection.schema && collection.schema.properties
    if (properties && properties.email && properties.password && properties.roles) {
      const required = collection.schema && collection.schema.required
      if (required && required.includes('email') && required.includes('password')) {
        return true
      }
      else {
        console.error(`Login Collection Failed: "${name}" schema properties email and password must be listed as 'required'`)
      }
    }
    else {
      console.error(`Login Collection Failed: "${name}" email, password and roles are mandatory schema properties`)
    }
  }
  return false
}

exports.createPagination = function createPagination (data, page, limit) {
  const pagination = {
    page: parseInt(page),
    itemsTotal: data.length,
    itemsPerPage: limit,
    pages: Math.ceil(data.length / limit)
  }
  pagination.page = pagination.page > pagination.pages ? pagination.pages + 1 : pagination.page
  if (pagination.page < pagination.pages) {
    pagination.pageNext = pagination.page + 1
  }
  if (pagination.page - 1 > 0) {
    pagination.pagePrev = pagination.page - 1
  }
  pagination.data = data.splice((pagination.page - 1) * limit, limit)
  return pagination
}

exports.createPagePagination = function createPagePagination (pageData, page, pageItems, totalItems) {
  const pages = totalItems >= 0 ? Math.ceil(totalItems / pageItems) : undefined
  page = parseInt(page)
  page = page > pages ? pages + 1 : page
  return {
    data: pageData,
    page: page > pages ? pages + 1 : page,
    itemsPerPage: pageItems,
    itemsTotal: totalItems,
    pages,
    pageNext: page < pages ? page + 1 : undefined,
    pagePrev: page - 1 > 0 ? page - 1 : undefined,
  }
}

exports.getDatabaseOffset = function getDatabaseOffset(page, itemsPerPage) {
  return (page - 1) * itemsPerPage
}
