const debug = require('debug')('expressa')
const MongoQS = require('mongo-querystring')
const mongoQuery = require('mongo-query')

const util = require('../util')
const queryStringParser = new MongoQS({})

function createPagination (data, req, limit) {
  const pagination = {
    page: parseInt(req.query.page),
    itemsTotal: data.length,
    itemsPerPage: limit,
    pages: Math.ceil(data.length / limit)
  }
  pagination.page = pagination.page > pagination.pages ? pagination.pages + 1 : pagination.page
  if (pagination.page < pagination.pages) {
    pagination.pageNext = pagination.page + 1
  }
  if (pagination.page - 1 > 0) {
    pagination.pagePrev = pagination.page - 1
  }
  pagination.data = data.splice((pagination.page - 1) * limit, limit)
  return pagination
}

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
  let total = 0
  if (typeof req.db[req.params.collection] === 'undefined') {
    throw new util.ApiError(404, 'unknown collection')
  }
  const fields = req.query.fields ? JSON.parse(req.query.fields) : null
  let query
  if (req.query.query) {
    query = JSON.parse(req.query.query)
  } else {
    const { skip, offset, limit, page, orderby, fields, ...params } = req.query // eslint-disable-line no-unused-vars
    query = queryStringParser.parse(params)
  }
  if (req.query.skip) {
    req.query.skip = parseInt(req.query.skip)
  }
  if (req.query.offset) {
    req.query.offset = parseInt(req.query.offset)
  }
  if (req.query.limit) {
    req.query.limit = parseInt(req.query.limit)
    if (req.query.page) {
      req.query.pageitems = req.query.limit
      delete req.query.limit
    }
  }
  let orderby
  if (req.query.orderby) {
    orderby = JSON.parse(req.query.orderby)
    orderby = util.normalizeOrderBy(orderby)
  }

  const data = await req.db[req.params.collection].find(query, req.query.skip || req.query.offset,
    req.query.limit, orderby, fields)
  total = data.length
  const limit = req.query.pageitems || (total > 10 ? 10 : total)
  // calculate pagination in case `page`-queryarg was passed
  const allowed = await Promise.all(data.map((doc) =>
    util.notify('get', req, req.params.collection, doc).catch(() => false)
  ))
  let result = data.filter((doc, i) => allowed[i] === true)
  if (req.query.page) {
    if (req.query.page <= 0) {
      throw new util.ApiError(400, 'invalid page number')
    }
    result = createPagination(result, req, limit)
  }
  await util.notify('getpresend', req, req.params.collection, result)
  return result
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
  mongoQuery(doc, {}, modifier)
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
