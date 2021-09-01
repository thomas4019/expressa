const auth = require('./auth')
const util = require('./util.js')
const debug = require('debug')('expressa')

module.exports = async function(api) {

  const loginCollections = (await util.getLoginCollections(api)).map((coll) => coll._id)

  api.addCollectionListener(['post', 'put'], loginCollections, async function updatePassword(req, collection, data) {
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

  api.addCollectionListener('post', loginCollections, async function roleCreateCheck(req, collection, data) {
    if (!data.roles) {
      data.roles = []
    }
    // user special case to allow first user to be admin
    if (collection === 'users') {
      const hasUsers = (await api.db.users.find({}, 0, 1)).length === 1
      if (!hasUsers && !data.roles.includes('Admin')) {
        throw new util.ApiError(400, 'first user must have role Admin')
      }
      if (hasUsers && data.roles.length > 0 && !req.hasPermission('users: modify roles')) {
        throw new util.ApiError(400, 'insufficient permissions to create user with roles')
      }
    }
    else {
      if (data.roles.length > 0 && !req.hasPermission(`${collection}: modify roles`)) {
        throw new util.ApiError(400, `insufficient permissions to create ${collection} with roles`)
      }
    }
  })

  api.addLateCollectionListener('put', loginCollections, async function roleChangeCheck(req, collection, data) {
    if (!req.hasPermission(`${collection}: modify roles`)) {
      const oldData = await api.db[collection].get(data._id)
      data.roles = oldData.roles
    }
  })

  api.addCollectionListenerWithPriority(['get', 'changed', 'deleted'], loginCollections, 100, function hidePasswordHashes(req, collection, data) {
    if (!req.hasPermission(`${collection}: view hashed passwords`)) {
      debug(`deleting password because "${collection}: view hashed passwords"-permission is not set`)
      delete data.password
    }
  })

  api.addCollectionListener('post', loginCollections, async function userUniquenessCheck(req, collection, data) {
    const result = await api.db[collection].find({email: data.email})
    if (result.length > 0) {
      throw new util.ApiError(409, 'This email is already registered.')
    }
  })

  /* Mantain users-roles reference */
  api.addCollectionListener('changed', 'role', async function addRoleToUserSchema(req, collection, data) {
    for (const coll of loginCollections) {
      const doc = await api.db.collection.get(coll)
      if (!doc.schema.properties.roles.items.enum.includes(data._id)) {
        doc.schema.properties.roles.items.enum.push(data._id)
        await api.db.collection.update(coll, doc)
        await api.notify('changed', req, coll, doc)
      }
    }
  })

  api.addCollectionListener('deleted', 'role', async function removeRoleToUserSchema(req, collection, data) {
    for (const coll of loginCollections) {
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
