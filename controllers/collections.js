const debug = require('debug')('expressa')
const MongoQS = require('mongo-querystring')

const util = require('../util')
const queryStringParser = new MongoQS({})

function assertValidCollection(req) {
  if (!req.db[req.params.collection]) {
    throw new util.ApiError(404, 'unknown collection')
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
    const { skip, offset, limit, page, pageitems, pagemetadisable, orderby, fields, ...params } = req.query // eslint-disable-line no-unused-vars
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
      fields['meta.owner'] = 1
    }
  }

  if (req.query.page != null) {
    req.query.page = parseInt(req.query.page)
    if (req.query.page <= 0) {
      throw new util.ApiError(400, 'invalid page number')
    }
    req.query.pageitems = parseInt(req.query.pageitems) || parseInt(req.query.limit) || 10
    req.query.offset = util.getDatabaseOffset(req.query.page, req.query.pageitems)
    req.query.orderby = req.query.orderby || util.normalizeOrderBy({ 'meta.created': 1 }) // paging requires orderby to ensure consistent results with offset and limit
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
  await util.notify('post', req, req.params.collection, data)

  const id = await req.db[req.params.collection].create(data)
  await util.notify('changed', req, req.params.collection, data)
  return {
    status: 'OK',
    id: id
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
  let oldDoc = {}
  try {
    oldDoc = await req.db[req.params.collection].get(req.params.id)
  } catch (error) {
    // happens when new documents are created via a PUT
    oldDoc = { meta: { owner: req.user._id } }
  }
  const data = req.body
  data._id = req.params.id
  data.meta = data.meta || {}
  data.meta.created = (oldDoc.meta || {}).created
  data.meta.owner = (oldDoc.meta || {}).owner
  await util.notify('put', req, req.params.collection, data)
  await req.db[req.params.collection].update(req.params.id, req.body)
  await util.notify('changed', req, req.params.collection, req.body)
  return {
    status: 'OK',
    id: data._id
  }
}

exports.updateById = async function (req) {
  assertValidCollection(req)
  const modifier = req.body

  const doc = await req.db[req.params.collection].get(req.params.id)
  const owner = doc.meta && doc.meta.owner
  util.mongoUpdate(doc, modifier)
  const newOwner = doc.meta && doc.meta.owner
  if (owner !== newOwner) {
    debug('attempting to change document owner.')
    doc.meta.owner = owner
  }
  req.body = doc
  await util.notify('put', req, req.params.collection, doc)

  req.body.meta.owner = newOwner
  await req.db[req.params.collection].update(req.params.id, req.body)
  await util.notify('changed', req, req.params.collection, req.body)
  return doc
}

exports.deleteById = async function (req) {
  assertValidCollection(req)
  const doc = await req.db[req.params.collection].get(req.params.id)
  await util.notify('delete', req, req.params.collection, doc)

  await req.db[req.params.collection].delete(req.params.id)
  await util.notify('deleted', req, req.params.collection, doc)
  return { status: 'OK' }
}
