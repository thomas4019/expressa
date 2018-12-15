var fs = require('fs')
var express = require('express')
var bodyParser = require('body-parser')
var auth = require('./auth')
var debug = require('debug')('expressa')
var onFinished = require('on-finished')
const Bluebird = require('bluebird')

const dbTypes = {
  cached: require('./db/cached'),
  file: require('./db/file'),
  memory: require('./db/memory'),
  postgres: require('./db/postgres'),
  mongo: require('./db/mongo'),
  mongodb: require('./db/mongo')
}
const util = require('./util')
const collectionsApi = require('./controllers/collections')

process.env.NODE_ENV = process.env.NODE_ENV || 'development'

async function bootstrapCollections (router) {
  var db = router.db
  const result = await db.collection.all()
  await Bluebird.map(result, function (collection) {
    if (typeof dbTypes[collection.storage] !== 'function') {
      console.error('missing ' + collection.storage + ' dbtype which is used by ' + collection._id)
      console.error('try updating to the latest version of expressa')
    }
    db[collection._id] = dbTypes[collection.storage](router.settings, collection._id)
    if (collection.cached) {
      db[collection._id] = dbTypes['cached'](db[collection._id])
      debug('initializing ' + collection._id + ' as a memory cached collection')
    }
    return Promise.resolve(db[collection._id].init())
  })
}

async function addStandardListeners (router) {
  await Promise.all([
    require('./collection_permissions')(router), // Add standard collection based permissions
    require('./listeners')(router),
    require('./validation_listeners')(router)
  ])
  debug('added standard listeners')
}

async function initCollections (db, router) {
  const data = await db.settings.get(process.env.NODE_ENV)
  router.settings = data
  db.collection = dbTypes[router.settings.collection_db_type || 'file'](router.settings, 'collection')
  try {
    await bootstrapCollections(router)
  } catch (err) {
    if (!fs.existsSync('data/settings/' + process.env.NODE_ENV + '.json')) {
      console.error(process.env.NODE_ENV + ' settings file does not exist.')
      console.error('Please visit the expressa admin page to run the installation process.')
      console.error('This is likely at http://localhost:3000/admin but may be different if you changed ports, etc.')
    } else {
      console.error('error reading settings')
      console.error(err.stack)
    }
    db.collection = dbTypes[router.settings.collection_db_type || 'file'](router.settings, 'collection')
  }
  debug('collections loaded.')
  await addStandardListeners(router)
  await util.notify('ready', router)
}

function ph (requestHandler) {
  return async function wrapper (req, res, next) {
    try {
      await requestHandler(req, res, next)
    } catch (err) {
      console.error(err)
      console.error(err.message)
      console.error(err.stack)
      console.error(err.status)
      res.status(err.status || 500).send({ error: err.result || err.message || err })
    }
  }
}

module.exports.api = function (settings) {
  var router = express.Router()
  router.custom = express.Router()
  router.dbTypes = dbTypes

  var db = {}
  router.settings = settings || {}
  db.settings = dbTypes[router.settings.settings_db_type || 'file'](router.settings, 'settings')
  router.db = db

  var eventListeners = {}
  router.eventListeners = eventListeners

  router.addListener = function addListener (events, priority, listener) {
    if (typeof events === 'string') {
      events = [events]
    }
    if (typeof priority === 'function') {
      listener = priority
      priority = 0
    }
    listener.priority = priority
    events.forEach(function (event) {
      eventListeners[event] = eventListeners[event] || []
      eventListeners[event].push(listener)
      eventListeners[event].sort(function (a, b) {
        return a.priority - b.priority
      })
    })
  }

  initCollections(db, router)

  router.use(function logger (req, res, next) {
    if (db.log) {
      onFinished(res, async function (err) {
        if (err) {
          console.error('error found while logging.')
          console.error(err)
          return
        }
        if (util.shouldLogRequest(req, res)) {
          const entry = util.createLogEntry(req, res)
          await db.log.create(entry)
        }
      })
    }
    next()
  })

  // The wildcard type ensures it works without the application/json header
  router.use(bodyParser.json({
    type: '*/*'
  }))

  router.use(function (req, res, next) {
    req.settings = router.settings
    req.eventListeners = router.eventListeners
    req.db = router.db
    next()
  })

  router.notify = util.notify

  router.get('/status', function (req, res, next) {
    res.send({
      installed: req.settings.installed || false
    })
  })

  router.post('/user/register', function (req, res, next) {
    req.url = '/users'
    next('route')
  })
  router.post('/user/login', ph(auth.getLoginRoute(router)))

  router.use(auth.middleware) // Add user id to request, if logged in

  var rolePermissions = require('./role_permissions')(router)
  router.use(rolePermissions.middleware) // Add user and permissions to request
  router.use(router.custom)

  router.get('/users?/me', function (req, res, next) {
    req.params.collection = 'users'
    req.params.id = req.uid
    collectionsApi.getById(req, res, next)
  })

  router.get('/:collection/schema', ph(collectionsApi.getSchema))
  router.get('/:collection', ph(collectionsApi.get))
  router.post('/:collection', ph(collectionsApi.insert))
  router.get('/:collection/:id', ph(collectionsApi.getById))
  router.put('/:collection/:id', ph(collectionsApi.replaceById))
  router.post('/:collection/:id/update', ph(collectionsApi.updateById))
  router.delete('/:collection/:id', ph(collectionsApi.deleteById))

  // Error handler, log and send to user
  router.use(function (err, req, res, next) {
    console.log('my err handler')
    console.error(err.stack)
    res.status(res.errCode || 500)
    if (process.env.DEBUG || (req.hasPermission && req.hasPermission('view errors'))) {
      res.send({
        error: err
      })
    } else {
      res.send({
        error: 'something wrong happened'
      })
    }
  })

  return router
}

module.exports.admin = function (settings) {
  var router = express.Router()
  router.get('/settings.js', function (req, res) {
    res.set('Content-Type', 'text/javascript')
    res.send('window.settings = ' + JSON.stringify(settings || {}) + '')
  })
  router.use(express.static('node_modules/expressa-admin'))
  return router
}
