const mongoToPostgres = require('mongo-query-to-postgres-jsonb')
const util = require('../util')

module.exports = function (settings, collectionId, collection) {
  const pool = util.getPgPool(settings.postgresql_uri)

  function getArrayPaths(key, value) {
    if (!value)
      return []
    if (value.type === 'array')
      return [key]
    if (value.type === 'object') {
      return Object.entries(value.properties)
        .map(([key2, value]) => {
          return getArrayPaths(key ? key + '.' + key2 : key2, value)
        })
        .flat()
    }
  }

  return {
    init: async function () {
      await pool.query('CREATE TABLE IF NOT EXISTS ' + collectionId + ' (id uuid primary key, data jsonb)')
    },
    all: async function () {
      return this.find({})
    },
    find: async function (rawQuery, offset, limit, orderby, fields) {
      const arrayFields = getArrayPaths('', collection.schema)
      const pgQuery = mongoToPostgres('data', rawQuery || {}, arrayFields)
      const select = fields ? mongoToPostgres.convertSelect('data', fields) : '*'
      let query = 'SELECT ' + select + ' FROM ' + collectionId + (pgQuery ? ' WHERE ' + pgQuery : '')
      if (typeof orderby !== 'undefined') {
        query += ' ORDER BY '
        query += orderby.map((ordering) => {
          return mongoToPostgres.convertDotNotation('data', ordering[0]) + (ordering[1] > 0 ? ' ASC' : ' DESC')
        }).join(', ')
      }
      if (typeof offset !== 'undefined') {
        query += ' OFFSET ' + offset
      }
      if (typeof limit !== 'undefined') {
        query += ' LIMIT ' + limit
      }
      const result = await pool.query(query)
      return result.rows.map((row) => row.data)
    },
    get: async function (id) {
      const result = await pool.query('SELECT * FROM ' + collectionId + ' WHERE id = $1', [id])
      if (result.rowCount === 0) {
        throw new util.ApiError(404, 'document not found')
      }
      return result.rows[0].data
    },
    create: async function (data) {
      util.addIdIfMissing(data)
      try {
        await pool.query('INSERT INTO ' + collectionId + ' (id, data) VALUES ($1, $2)', [data._id, data])
      } catch (e) {
        if (e.message.includes('duplicate key')) {
          throw new util.ApiError(409, 'document already exists')
        }
        throw e
      }
      return data._id
    },
    update: async function (id, data) {
      if (typeof data._id === 'undefined') {
        data._id = id
      }
      const result = await pool.query('UPDATE ' + collectionId + ' SET data=$2,id=$3 WHERE id=$1', [id, data, data._id])
      if (result.rowCount === 0) {
        throw new util.ApiError(404, 'document not found')
      }
      return data
    },
    delete: async function (id) {
      const result = await pool.query('DELETE FROM ' + collectionId + ' WHERE id=$1', [id])
      if (result.rowCount === 0) {
        throw new util.ApiError(404, 'document not found')
      }
      return 'OK'
    }
  }
}
