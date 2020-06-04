const Bluebird = require('bluebird')

const util = require('../util')

exports.updateAdminPermissions = async function (api) {
  const modules = Object.values(api.modules)
  const permissions = [].concat(...await Bluebird.map(modules, (m) => util.resolve(m.permissions, api)))
  await api.db.role.update('Admin', {
    permissions: permissions.reduce((obj, p) => { obj[p] = 1; return obj }, {})
  })
}

exports.install = async (req, api) => {
  const selectedModules = req.body.modules
  const installedModules = Object.keys(req.modules)
  const missingModules = selectedModules.filter((module) => !installedModules.includes(module))
  if (missingModules.length > 0) {
    throw new util.ApiError(400, 'unknown modules')
  }

  const modules = selectedModules.map((name) => req.modules[name])

  const settings = req.body.settings
  settings._id = process.env.NODE_ENV
  settings.jwt_secret = '123423'
  Object.assign(req.settings, settings)
  await req.db.settings.create(settings)

  for (const m of modules) {
    const colls = await util.resolve(m.collections, api)
    if (colls) {
      for (const coll of colls) {
        if (!coll.storage) {
          coll.storage = 'file'
        }
        if (coll._id == 'users' && req.body.settings.user_storage) {
          coll.storage = req.body.settings.user_storage
        }
        await req.db.collection.create(coll)
        await api.notify('changed', req, 'collection', coll)
        // await collectionsApi.insert(Object.assign({}, req, { body: coll }))
      }
    }

    await util.resolve(m.install, api)
    await util.resolve(m.init, api)
  }

  await exports.updateAdminPermissions(api)

  settings.installed = true
  await req.db.settings.update(settings._id, settings)
  return { }
}

exports.getSettingsSchema = async (req, api) => {
  const colls = await util.resolve(api.modules.core.collections, api)
  const settings = colls.find((m) => m._id === 'settings')
  settings.schema.properties = {
    /*collection_storage: {
      type: 'string',
      enum: ['file', 'mongo', 'postgres']
    },*/
    user_storage: {
      type: 'string',
      enum: ['file', 'mongo', 'postgres']
    },
    email: {
      type: 'string',
      description: 'Administrator Email'
    },
    password: {
      type: 'string',
      description: 'Administrator Password'
    },
    ...settings.schema.properties
  }
  settings.schema.required = settings.schema.required || ['postgresql_uri', 'mongodb_uri']
  settings.schema.required.push('email');
  settings.schema.required.push('password');
  settings.schema.required.push('user_storage');
  return settings
}
