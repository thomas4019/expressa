const pg = require('pg')
const uuid = require('node-uuid')
const mongoToPostgres = require('mongo-query-to-postgres-jsonb')
const util = require('../util')

module.exports = function (settings, collection) {
  var pool = new pg.Pool({ connectionString: settings.postgresql_uri })

  return {
    init: async function () {
      await pool.query('CREATE TABLE IF NOT EXISTS ' + collection + ' (id text primary key, data jsonb)')
    },
    all: async function () {
      return this.find({})
    },
    find: async function (rawQuery, offset, limit, orderby) {
      const pgQuery = mongoToPostgres('data', rawQuery || {})
      let query = 'SELECT * FROM ' + collection + (pgQuery ? ' WHERE ' + pgQuery : '')
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
      const result = await pool.query('SELECT * FROM ' + collection + ' WHERE id = $1', [id])
      if (result.rowCount === 0) {
        throw new util.ApiError(404, 'document not found')
      }
      return result.rows[0].data
    },
    create: async function (data) {
      if (typeof data._id === 'undefined') {
        data._id = uuid.v4()
      }
      await pool.query('INSERT INTO ' + collection + ' (id, data) VALUES ($1, $2)', [data._id, data])
      return data._id
    },
    update: async function (id, data) {
      if (typeof data._id === 'undefined') {
        data._id = id
      }
      const result = await pool.query('UPDATE ' + collection + ' SET data=$2,id=$3 WHERE id=$1', [id, data, data._id])
      if (result.rowCount === 0) {
        throw new util.ApiError(404, 'document not found')
      }
      return data
    },
    delete: async function (id) {
      const result = await pool.query('DELETE FROM ' + collection + ' WHERE id=$1', [id])
      if (result.rowCount === 0) {
        throw new util.ApiError(404, 'document not found')
      }
      return 'OK'
    }
  }
}
