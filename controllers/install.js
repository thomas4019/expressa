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

  for (const m of modules) {
    const colls = await util.resolve(m.collections, api)
    if (colls) {
      for (const coll of colls) {
        if (!coll.storage) {
          coll.storage = 'file'
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

  const settings = req.body.settings
  settings._id = process.env.NODE_ENV
  settings.installed = true
  settings.jwt_secret = '123423'
  Object.assign(req.settings, settings)
  await req.db.settings.create(settings)
  return { }
}

exports.getSettingsSchema = async (req, api) => {
  const colls = await util.resolve(api.modules.core.collections, api)
  const settings = colls.find((m) => m._id === 'settings')
  return settings
}
