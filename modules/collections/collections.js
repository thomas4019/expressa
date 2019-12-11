function getCollectionPermissions (name, hasOwner) {
  let permissions = ['create', 'view', 'edit', 'delete'].map((action) => `${name}: ${action}`)
  if (hasOwner) {
    permissions = permissions.concat(['view', 'edit', 'delete'].map((action) => `${name}: ${action} own`))
  }
  return permissions
}

exports.permissions = async function (app) {
  const collections = (await app.db.collection.all()).map((collection) => collection._id)
  // flatten the permissions into a single list
  const permissions = [].concat(...collections.map(getCollectionPermissions))
  return permissions
}

exports.settingSchema = {
  collection_db_type: {
    type: 'string',
    description: 'The storage method for the collection of collections.'
  },
  settings_db_type: {
    type: 'string',
    description: 'The storage method for the collection of settings. If this is not \'file\' then the necessary settings to connect must be passed into the api function.',
    default: 'file'
  },
  file_storage_path: {
    type: 'string',
    description: 'The name of the folder where to put collections stored in the file system.',
    default: 'data'
  },
}
