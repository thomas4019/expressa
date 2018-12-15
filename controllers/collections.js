const util = require('../util')
const debug = require('debug')('expressa')
const MongoQS = require('mongo-querystring')
const mongoQuery = require('mongo-query')

const queryStringParser = new MongoQS({})

function createPagination (data, req, limit) {
  var pagination = {
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

exports.getSchema = async function (req, res, next) {
  const collection = await req.db.collection.get(req.params.collection)
  const allowed = await util.notify('get', req, 'schemas', collection)
  if (allowed === true) {
    res.send(collection.schema)
  } else {
    res.status(allowed.code || 500).send({
      error: allowed.message || 'forbidden'
    })
  }
}

exports.get = async function (req, res, next) {
  var total = 0
  if (typeof req.db[req.params.collection] === 'undefined') {
    return res.status(404).send({
      error: 'page not found'
    })
  }
  if (Object.keys(req.query).length > 0) {
    var query
    var orderby
    if (typeof req.query.query !== 'undefined') {
      query = JSON.parse(req.query.query)
    } else {
      var params = JSON.parse(JSON.stringify(req.query))
      delete params['skip']
      delete params['offset']
      delete params['limit']
      delete params['page']
      delete params['orderby']
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
    if (typeof req.query.orderby !== 'undefined') {
      orderby = JSON.parse(req.query.orderby)

      if (Array.isArray(orderby)) {
        orderby = orderby.map(function (ordering) {
          if (typeof ordering === 'string') {
            return [ordering, 1]
          } else if (Array.isArray(ordering)) {
            if (ordering.length === 1) {
              return [ordering[0], 1] // add 1 (default to ascending sort)
            }
          }
          return ordering
        })
      } else {
        var arr = []
        for (var key in orderby) {
          arr.push([key, orderby[key]])
        }
        orderby = arr
      }
    } else {
      orderby = undefined
    }
    const data = await req.db[req.params.collection].find(query, req.query.skip || req.query.offset, req.query.limit, orderby)
    total = data.length
    var limit = req.query.pageitems || (total > 10 ? 10 : total)
    // calculate pagination in case `page`-queryarg was passed
    const allowed = await Promise.all(data.map(function (doc) {
      return util.notify('get', req, req.params.collection, doc)
    }))
    let result = data.filter((doc, i) => allowed[i] === true)
    if (req.query.page) {
      if (req.query.page <= 0) {
        return res.status(400).send({
          error: 'invalid page number'
        })
      }
      result = createPagination(data, req, limit)
    }
    await util.notify('getpresend', req, req.params.collection, result)
    res.send(result)
  } else {
    const data = await req.db[req.params.collection].all()
    const allowed = await Promise.all(data.map(function (doc) {
      return util.notify('get', req, req.params.collection, doc)
    }))
    let result = data.filter(function (doc, i) {
      return allowed[i] === true
    })
    await util.notify('getpresend', req, req.params.collection, result)
    res.send(result)
  }
}

exports.insert = async function (req, res, next) {
  var data = req.body
  const allowed = await util.notify('post', req, req.params.collection, data)
  if (allowed === true) {
    const id = await req.db[req.params.collection].create(data)
    util.notify('changed', req, req.params.collection, data)
    res.send({
      status: 'OK',
      id: id
    })
  } else {
    debug('disallowed creation of ' + req.params.collection)
    res.status(allowed.code || 500).send({
      error: allowed.message
    })
  }
}

exports.getById = async function (req, res, next) {
  if (req.params.id === 'schema' || !req.db[req.params.collection]) {
    return next()
  }
  const data = await req.db[req.params.collection].get(req.params.id)
  const allowed = await util.notify('get', req, req.params.collection, data)
  if (allowed === true) {
    await util.notify('getpresend', req, req.params.collection, data)
    res.send(data)
  } else {
    res.status(allowed.code || 403).send({
      error: allowed.message || 'forbidden'
    })
  }
}

exports.replaceById = async function (req, res, next) {
  var data = req.body
  data._id = req.params.id
  const allowed = await util.notify('put', req, req.params.collection, data)
  if (allowed === true) {
    await req.db[req.params.collection].update(req.params.id, req.body)
    await util.notify('changed', req, req.params.collection, req.body)
    res.send({
      status: 'OK',
      id: data._id
    })
  } else {
    res.status(allowed.code || 500).send({
      error: allowed.message || 'forbidden'
    })
  }
}

exports.updateById = async function (req, res, next) {
  var modifier = req.body

  const doc = await req.db[req.params.collection].get(req.params.id)
  const owner = doc.meta.owner
  mongoQuery(doc, {}, modifier)
  const newOwner = doc.meta.owner
  if (owner !== newOwner) {
    debug('attempting to change document owner.')
    doc.meta.owner = owner
  }
  req.body = doc
  const allowed = await util.notify('put', req, req.params.collection, doc)
  if (allowed === true) {
    req.body.meta.owner = newOwner
    req.db[req.params.collection].update(req.params.id, req.body)
    await util.notify('changed', req, req.params.collection, req.body)
    res.send(doc)
  } else {
    res.status(allowed.code || 500).send({
      error: allowed.message || 'forbidden'
    })
  }
}

exports.deleteById = async function (req, res, next) {
  const allowed = await util.notify('delete', req, req.params.collection, {
    _id: req.params.id
  })
  if (allowed === true) {
    await req.db[req.params.collection].delete(req.params.id)
    await util.notify('deleted', req, req.params.collection, {
      _id: req.params.id
    })
    res.send({
      status: 'OK'
    })
  } else {
    res.status(allowed.code || 500).send({
      error: allowed.message || 'forbidden'
    })
  }
}
