const fs = require('fs')
const express = require('express')
const bodyParser = require('body-parser')
const debug = require('debug')('expressa')
const _ = require('lodash')
const Bluebird = require('bluebird')
Bluebird.config({
  longStackTraces: true
})
global.Promise = Bluebird

const dbTypes = {
  cached: require('./db/cached'),
  file: require('./db/file'),
  memory: require('./db/memory'),
  postgres: require('./db/postgres'),
  mongo: require('./db/mongo'),
  mongodb: require('./db/mongo')
}
const auth = require('./auth')
const util = require('./util')
const collectionsApi = require('./controllers/collections')
const usersApi = require('./controllers/users')
const installApi = require('./controllers/install')
const userPermissionsMiddleware = require('./middleware/users_permissions')
const loggingMiddleware = require('./middleware/logging')

process.env.NODE_ENV = process.env.NODE_ENV || 'development'

async function bootstrapCollections (router) {
  const collections = await router.db.collection.all()
  await Promise.all(collections.map((collection) => {
    if (!dbTypes[collection.storage]) {
      console.error('missing ' + collection.storage + ' dbtype which is used by ' + collection._id)
      console.error('try updating to the latest version of expressa')
    }
    return router.setupCollectionDb(collection)
  }))
}

let initialized = false

async function initCollections (db, router) {
  debug('init collections')
  try {
    const data = await db.settings.get(process.env.NODE_ENV)
    router.settings = data
  } catch (err) {
    const filePath = router.settings.file_storage_path || 'data'
    if (!fs.existsSync(filePath + '/settings/' + process.env.NODE_ENV + '.json')) {
      console.error(process.env.NODE_ENV + ' settings file does not exist.')
      console.error('Please visit the expressa admin page to run the installation process.')
      console.error('This is likely at http://localhost:3000/admin but may be different if you changed ports, etc.')
    } else {
      console.error('error reading settings')
      console.error(err.stack)
    }
  }
  db.collection = dbTypes[router.settings.collection_db_type || 'file'](router.settings, 'collection')
  await bootstrapCollections(router)
  debug('collections loaded.')

  await Promise.all([
    require('./listeners_collection_permissions')(router),
    require('./listeners')(router),
    require('./listeners_validation')(router),
    require('./listeners_users')(router),
  ])
  debug('added standard listeners')

  initialized = true
  await util.notify('ready', router)
}

function ph (requestHandler) {
  return async function wrapper (req, res, next) {
    const collectionName = req.params.collection
    let collection = {}
    try {
      collection = collectionName ? await req.db.collection.get(collectionName) : {}
    } catch (e) {
      if (!e.message.includes('document not found')) {
        console.error(e)
      }
    }
    if (!collection.allowHTTPCaching) {
      res.header('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.header('Expires', '-1')
      res.header('Pragma', 'no-cache')
    }
    try {
      const result = await requestHandler(req, res, next)
      if (typeof result !== 'object') {
        res.status(500).send('invalid result')
      }
      debug(`${200} ${req.method} ${req.url} body: ${JSON.stringify(req.body)} result: ${JSON.stringify(result)}`)
      res.send(result)
    } catch (err) {
      err.status = err.status || 500
      debug(`${err.status} ${req.method} ${req.url} ${err.stack}`)
      if ((req.settings.logging && req.settings.logging.print_400_errors) || err.status >= 500) {
        console.error(err)
      }
      res.status(err.status).send({ error: err.result || err.message || err })
    }
  }
}

module.exports.api = function (settings) {
  const router = express.Router()
  router.custom = express.Router()
  router.dbTypes = dbTypes
  router.settings = settings || {}
  router.db = {
    settings: dbTypes[router.settings.settings_db_type || 'file'](router.settings, 'settings')
  }
  router.eventListeners = {}

  router.setupCollectionDb = async function(collection) {
    router.db[collection._id] = dbTypes[collection.storage](router.settings, collection._id)
    if (collection.cacheInMemory) {
      router.db[collection._id] = dbTypes['cached'](router.db[collection._id])
      debug('initializing ' + collection._id + ' as a memory cached collection')
    }
    return router.db[collection._id].init()
  }

  router.addSingleCollectionListener = function (event, listener) {
    if (!router.eventListeners[event]) {
      router.eventListeners[event] = []
    }
    router.eventListeners[event].push(listener)
    router.eventListeners[event].sort((a, b) => a.priority - b.priority)
    if (event === 'ready' && initialized) {
      listener(router)
    }
  }

  router.addLateCollectionListener = function (events, collections, listener) {
    listener.priority = 10
    router.addCollectionListener(events, collections, listener)
  }

  router.addCollectionListener = function (events, collections, listener) {
    events = _.castArray(events)
    collections = _.castArray(collections)
    listener.priority = listener.priority || 0
    listener.collections = collections
    events.forEach(function (event) {
      router.addSingleCollectionListener(event, listener)
    })
  }

  router.addListener = function addListener (events, priority, listener) {
    events = _.castArray(events)
    if (typeof priority === 'function') {
      listener = priority
      priority = 0
    }
    listener.priority = priority
    events.forEach(function (event) {
      router.addSingleCollectionListener(event, listener)
    })
  }

  router.getSetting = function (name) {
    return _.get(router.settings, name)
  }

  initCollections(router.db, router)

  const modules = ['collections', 'core', 'logging', 'permissions']
  router.modules = {}
  for (const module of modules) {
    router.modules[module] = require(`./modules/${module}/${module}`)
    if (router.modules[module].init) {
      router.modules[module].init(router)
    }
  }

  router.use(bodyParser.json({
    type: '*/*' // The wildcard type ensures it works even without the application/json header
  }))

  router.use(function (req, res, next) {
    req.settings = router.settings
    req.eventListeners = router.eventListeners
    req.db = router.db
    req.modules = router.modules
    req.setupCollectionDb = router.setupCollectionDb
    req.getSetting = router.getSetting
    next()
  })

  router.use(loggingMiddleware)

  router.notify = util.notify

  router.get('/status', ph((req) => ({ installed: req.settings.installed || false })))
  router.post('/install', ph(async (req) => installApi.install(req, router)))

  router.post('/user/login', ph(usersApi.login))

  router.use(auth.middleware) // Add user id to request
  router.use(userPermissionsMiddleware) // Add user and permissions to request

  router.use(router.custom) // Externally added middleware

  router.post('/user/register', ph(usersApi.register))
  router.get('/users?/me', ph(usersApi.getMe))

  router.get('/:collection/schema', ph(collectionsApi.getSchema))
  router.get('/:collection', ph(collectionsApi.get))
  router.post('/:collection', ph(collectionsApi.insert))
  router.get('/:collection/:id', ph(collectionsApi.getById))
  router.put('/:collection/:id', ph(collectionsApi.replaceById))
  router.post('/:collection/:id/update', ph(collectionsApi.updateById))
  router.delete('/:collection/:id', ph(collectionsApi.deleteById))

  // Error handler, log and send to user
  // eslint-disable-next-line no-unused-vars
  router.use(function (err, req, res, next) {
    console.error('my err handler')
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
  const router = express.Router()
  router.get('/settings.js', function (req, res) {
    res.set('Content-Type', 'text/javascript')
    res.send('window.settings = ' + JSON.stringify(settings || {}) + '')
  })
  router.use(express.static('node_modules/expressa-admin'))
  return router
}
