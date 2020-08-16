const util = require('../util')

exports.updateAdminPermissions = async function (api) {
  if (!api.db.role) {
    return // not installed yet
  }
  const modules = Object.values(api.modules)
  const permissions = [].concat(...await Promise.all(modules.map((m) => util.resolve(m.permissions, api)))).filter(x => x !== undefined)
  let adminRole = { permissions: {} }
  try {
    adminRole = await api.db.role.get('Admin')
  } catch (e) {
    // expected if not installed
  }
  const neededPermissions = permissions.reduce((obj, p) => { obj[p] = 1; return obj }, {})
  Object.assign(adminRole.permissions, neededPermissions)
  await api.db.role.update('Admin', adminRole)
}

exports.install = async (req, api) => {
  const selectedModules = req.body.modules
  const installedModules = Object.keys(req.modules)
  const missingModules = selectedModules.filter((module) => !installedModules.includes(module))
  if (missingModules.length > 0) {
    throw new util.ApiError(400, 'unknown modules')
  }

  const modules = selectedModules.map((name) => req.modules[name])

  const settings = JSON.parse(JSON.stringify(req.body.settings))
  settings._id = process.env.NODE_ENV
  settings.jwt_secret = util.createSecureRandomId()
  // Remove fields that are not real settings
  delete settings.email
  delete settings.user_storage
  delete settings.password
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
  }

  await exports.updateAdminPermissions(api)

  settings.installed = true
  settings.enforce_permissions = true
  Object.assign(req.settings, settings)
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
  settings.schema.required.push('email')
  settings.schema.required.push('password')
  settings.schema.required.push('user_storage')
  return settings
}
