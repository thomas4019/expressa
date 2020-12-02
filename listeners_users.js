const auth = require('./auth')
const util = require('./util.js')
const debug = require('debug')('expressa')

module.exports = async function(api) {

  const authCollections = (await util.getAuthCollections(api)).map((coll) => coll._id)

  api.addCollectionListener(['post', 'put'], authCollections, async function updatePassword(req, collection, data) {
    if (req.method === 'PUT') {
      const oldData = await api.db[collection].get(data._id)
      if (!data.password) {
        data.password = oldData.password // preserve password if not explicitly set
      }
    }
    if (data.password && data.password.length !== 60 && data.password[0] !== '$') {
      debug('hashing and replacing password in the user document.')
      data.password = auth.createHash(data.password)
    }
  })

  api.addLateCollectionListener('put', authCollections, async function roleChangeCheck(req, collection, data) {
    if (!req.hasPermission(`${collection}: modify roles`)) {
      const oldData = await api.db[collection].get(data._id)
      data.roles = oldData.roles
    }
  })

  // TODO how to add back in the password on PUT?
  api.addCollectionListenerWithPriority('get', authCollections, -100, function hidePasswordHashes(req, collection, data) {
    if (!req.hasPermission(`${collection}: view hashed passwords`)) {
      debug(`deleting password because "${collection}: view hashed passwords"-permission is not set`)
      delete data.password
    }
  })

  api.addCollectionListener('post', authCollections, async function userUniquenessCheck(req, collection, data) {
    const result = await api.db[collection].find({email: data.email})
    if (result.length > 0) {
      throw new util.ApiError(409, 'This email is already registered.')
    }
  })

  /* Mantain users-roles reference */
  api.addCollectionListener('changed', 'role', async function addRoleToUserSchema(req, collection, data) {
    for (const coll of authCollections) {
      const doc = await api.db.collection.get(coll)
      if (!doc.schema.properties.roles.items.enum.includes(data._id)) {
        doc.schema.properties.roles.items.enum.push(data._id)
        await api.db.collection.update(coll, doc)
        await api.notify('changed', req, coll, doc)
      }
    }
  })

  api.addCollectionListener('deleted', 'role', async function removeRoleToUserSchema(req, collection, data) {
    for (const coll of authCollections) {
      const doc = await api.db.collection.get(coll)
      const roles = doc.schema.properties.roles.items.enum
      if (roles.includes(data._id)) {
        roles.splice(roles.indexOf(data._id), 1)
        await api.db.collection.update(coll, doc)
        await api.notify('changed', req, coll, doc)
      }
    }
  })
}
