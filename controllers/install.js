const _ = require('lodash')
const Bluebird = require('bluebird')

const util = require('../util')

exports.updateAdminPermissions = async function (api) {
  const modules = Object.values(api.modules)
  const permissions = _.flatten(await Bluebird.map(modules, (m) => util.resolve(m.permissions, api)))
  await api.db.role.update('Admin', {
    permissions: _.zipObject(permissions, permissions.map(() => 1))
  })
}

exports.install = async (req, api) => {
  const selectedModules = req.body.modules
  const missingModules = _.difference(selectedModules, Object.keys(req.modules))
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
  Object.assign(req.settings, settings)
  await req.db.settings.create(settings)

  return { }
}
