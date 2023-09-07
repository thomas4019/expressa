const debug = require('debug')('expressa')
const MongoQS = require('mongo-querystring')

const util = require('../util')
const queryStringParser = new MongoQS({})

function assertValidCollection(req) {
  if (!req.db[req.params.collection]) {
    throw new util.ApiError(404, 'unknown collection')
  }
}

async function validateDocumentOwner(req, doc) {
  if (!doc.meta.owner_collection) {
    throw new util.ApiError(417, 'no owner_collection for owner found')
  }
  if (!(doc._id === doc.meta.owner && req.params.collection === doc.meta.owner_collection)) {
    const count = await req.db[doc.meta.owner_collection].count({ _id: doc.meta.owner }, undefined, 1)
    if (!count) {
      throw new util.ApiError(417, 'invalid owner')
    }
  }
}

async function setDocumentOwner(req, doc) {
  const schema = await req.db.collection.get(req.params.collection)
  if (schema.documentsHaveOwners) {
    util.addIdIfMissing(doc)
    doc.meta ??= {}
    if (req.uid) {
      // request done by logged in user
      if (!doc.meta.owner) {
        // no owner - make logged in user as owner
        doc.meta.owner = req.user._id
        doc.meta.owner_collection = req.ucollection
      } else {
        if (!req.hasPermission(`${req.params.collection}: modify owner`)) {
          // has an owner - but if no permission to modify owner then override owner to logged in user
          doc.meta.owner = req.user._id
          doc.meta.owner_collection = req.ucollection
        }
      }
    } else {
      // request done by NOT logged in user
      if (schema.enableLogin) {
        // is a user/login collection so make self owner
        doc.meta.owner = doc._id
        doc.meta.owner_collection = req.params.collection
      } else {
        // is a normal collection
        debug('unable to find valid owner')
      }
    }
    if (doc.meta.owner) {
      await validateDocumentOwner(req, doc)
    }
  }
}

exports.getSchema = async function (req) {
  const collection = await req.db.collection.get(req.params.collection)
  await util.notify('get', req, 'schemas', collection)
  return collection.schema
}

exports.get = async function (req) {
  assertValidCollection(req)
  if (typeof req.db[req.params.collection] === 'undefined') {
    throw new util.ApiError(404, 'unknown collection')
  }

  const fields = req.query.fields ? JSON.parse(req.query.fields) : null

  let data, query
  if (req.query.query) {
    query = JSON.parse(req.query.query)
  }
  else {
    const { skip, offset, limit, page, pageitems, pagemetadisable, orderby, ...params } = req.query // eslint-disable-line no-unused-vars
    delete params.fields
    query = queryStringParser.parse(params)
  }
  if (req.query.orderby) {
    req.query.orderby = JSON.parse(req.query.orderby)
    req.query.orderby = util.normalizeOrderBy(req.query.orderby)
  }

  if (req.uid) {
    // scenario where logged in user can only retrieve own docs
    if (!req.hasPermission(`${req.params.collection}: view`) && req.hasPermission(`${req.params.collection}: view own`)) {
      query['meta.owner'] = req.uid
      // if fields is null then all fields are requested
      if (fields) fields['meta.owner'] = 1
    }
  }

  if (req.query.page != null) {
    req.query.page = parseInt(req.query.page)
    if (req.query.page <= 0) {
      throw new util.ApiError(400, 'invalid page number')
    }
    req.query.pageitems = parseInt(req.query.pageitems) || parseInt(req.query.limit) || 10
    req.query.offset = util.getDatabaseOffset(req.query.page, req.query.pageitems)
    req.query.orderby = util.orderByForPagedRequests(req.query.orderby)
    delete req.query.limit
    delete req.query.skip
    let pageData, totalItems
    if (req.query.pagemetadisable) {
      // a way to skip the extra count database call, but lose additional page detail
      pageData = await req.db[req.params.collection].find(query, req.query.offset, req.query.pageitems, req.query.orderby, fields)
    }
    else {
      // this is default - full detail
      [pageData, totalItems] = await Promise.all([
        req.db[req.params.collection].find(query, req.query.offset, req.query.pageitems, req.query.orderby, fields),
        req.db[req.params.collection].count(query)
      ])
    }
    await Promise.all(pageData.map((doc) => util.notify('get', req, req.params.collection, doc)))
    data = util.createPagePagination(pageData, req.query.page, req.query.pageitems, totalItems)
  }
  else {
    if (req.query.limit) {
      req.query.limit = parseInt(req.query.limit)
    }
    if (req.query.skip) {
      req.query.offset = parseInt(req.query.skip)
      delete req.query.skip
    }
    else if (req.query.offset) {
      req.query.offset = parseInt(req.query.offset)
    }
    data = await req.db[req.params.collection].find(query, req.query.offset, req.query.limit, req.query.orderby, fields)
    await Promise.all(data.map((doc) => util.notify('get', req, req.params.collection, doc)))
  }

  await util.notify('getpresend', req, req.params.collection, data)
  return data
}

exports.insert = async function (req) {
  assertValidCollection(req)
  const data = req.body
  req.customResponseData = req.customResponseData || {}
  await util.notify('post', req, req.params.collection, data)
  await setDocumentOwner(req, data)
  const id = await req.db[req.params.collection].create(data)
  await util.notify('changed', req, req.params.collection, data)
  return {
    status: 'OK',
    id: id,
    ...req.customResponseData,
  }
}

exports.getById = async function (req) {
  assertValidCollection(req)
  const fields = req.query.fields ? JSON.parse(req.query.fields) : null
  const data = await req.db[req.params.collection].get(req.params.id, fields)
  await util.notify('get', req, req.params.collection, data)
  await util.notify('getpresend', req, req.params.collection, data)
  return data
}

exports.replaceById = async function (req) {
  assertValidCollection(req)
  req.customResponseData = req.customResponseData || {}
  const data = req.body
  let oldDoc = {}
  try {
    oldDoc = await req.db[req.params.collection].get(req.params.id)
  } catch (error) {
    // happens when new documents are created via a PUT
    oldDoc = { meta: { owner: req.user._id, owner_collection: 'users' } }
    data._id = req.params.id.trim()
    await setDocumentOwner(req, data)
  }
  if (data._id) {
    data._id = data._id.trim()
  } else {
    data._id = req.params.id.trim()
  }
  data.meta = data.meta || {}
  data.meta.created = (oldDoc.meta || {}).created
  if (data.meta.owner !== oldDoc.meta.owner || data.meta.owner_collection !== oldDoc.meta.owner_ollection) {
    if (req.hasPermission(`${req.params.collection}: modify owner`)) {
      if (oldDoc.meta.owner) {
        await validateDocumentOwner(req, data)
      }
    } else {
      debug('attempting to change document owner.')
      data.meta.owner = oldDoc.meta.owner
      data.meta.owner_collection = oldDoc.meta.owner_collection
    }
  }
  await util.notify('put', req, req.params.collection, data)
  await req.db[req.params.collection].update(req.params.id, data)
  await util.notify('changed', req, req.params.collection, data)
  return {
    status: 'OK',
    id: data._id,
    ...req.customResponseData,
  }
}

exports.updateById = async function (req) {
  assertValidCollection(req)
  req.customResponseData = req.customResponseData || {}
  const modifier = req.body

  const doc = await req.db[req.params.collection].get(req.params.id)
  const owner = doc.meta && doc.meta.owner
  const ownerCollection = doc.meta && doc.meta.owner_collection
  util.mongoUpdate(doc, modifier)
  const newOwner = doc.meta && doc.meta.owner
  const newOwnerCollection = doc.meta && doc.meta.owner_collection
  if (owner !== newOwner || ownerCollection !== newOwnerCollection) {
    if (req.hasPermission(`${req.params.collection}: modify owner`)) {
      if (owner) {
        await validateDocumentOwner(req, doc)
      }
    } else {
      debug('attempting to change document owner.')
      doc.meta.owner = owner
      doc.meta.owner_collection = ownerCollection
    }
  }
  if (doc._id) {
    doc._id = doc._id.trim()
  } else {
    throw new util.ApiError(400, '_id property is required')
  }
  req.body = doc
  await util.notify('put', req, req.params.collection, doc)
  await req.db[req.params.collection].update(req.params.id, req.body)
  await util.notify('changed', req, req.params.collection, req.body)
  if (Object.keys(req.customResponseData)) {
    return {
      ...doc,
      ...req.customResponseData,
    }
  }
  return doc
}

exports.deleteById = async function (req) {
  assertValidCollection(req)
  req.customResponseData = req.customResponseData || {}
  const doc = await req.db[req.params.collection].get(req.params.id)
  await util.notify('delete', req, req.params.collection, doc)

  await req.db[req.params.collection].delete(req.params.id)
  await util.notify('deleted', req, req.params.collection, doc)
  return {
    status: 'OK',
    ...req.customResponseData,
  }
}
