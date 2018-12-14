const pg = require('pg')
const uuid = require('node-uuid')
const mongoToPostgres = require('mongo-query-to-postgres-jsonb')
const util = require('../util')

module.exports = function (settings, collection) {
  var pool = new pg.Pool({ connectionString: settings.postgresql_uri })

  return {
    init: async function () {
      const client = await pool.connect()
      await client.query('CREATE TABLE IF NOT EXISTS ' + collection + ' (id text primary key, data jsonb)')
    },
    all: async function () {
      return this.find({})
    },
    find: function (query, offset, limit, orderby) {
      var pgQuery = mongoToPostgres('data', query || {})
      return new Promise(function (resolve, reject) {
        pool.connect(function (err, client, done) {
          if (err) {
            return reject(err, 500)
          }
          var query = 'SELECT * FROM ' + collection + (pgQuery ? ' WHERE ' + pgQuery : '')
          if (typeof orderby !== 'undefined') {
            query += ' ORDER BY '
            query += orderby.map(function (ordering) {
              return mongoToPostgres.convertDotNotation('data', ordering[0]) + (ordering[1] > 0 ? ' ASC' : ' DESC')
            }).join(', ')
          }
          if (typeof offset !== 'undefined') {
            query += ' OFFSET ' + offset
          }
          if (typeof limit !== 'undefined') {
            query += ' LIMIT ' + limit
          }
          client.query(query, function (err, result) {
            done()
            if (err) {
              return reject(err, 500)
            }
            resolve(result.rows.map(function (row) {
              return row.data
            }))
          })
        })
      })
    },
    get: async function (id) {
      const client = await pool.connect()
      const result = await client.query('SELECT * FROM ' + collection + ' WHERE id = $1', [id])
      if (result.rowCount === 0) {
        throw new util.ApiError(404, 'document not found')
      }
      return result.rows[0].data
    },
    create: async function (data) {
      const client = await pool.connect()
      if (typeof data._id === 'undefined') {
        data._id = uuid.v4()
      }
      await client.query('INSERT INTO ' + collection + ' (id, data) VALUES ($1, $2)', [data._id, data])
      return data._id
    },
    update: async function (id, data) {
      if (typeof data._id === 'undefined') {
        data._id = id
      }
      const client = await pool.connect()
      const result = await client.query('UPDATE ' + collection + ' SET data=$2,id=$3 WHERE id=$1', [id, data, data._id])
      if (result.rowCount === 0) {
        throw new util.ApiError(404, 'document not found')
      }
      return data
    },
    delete: async function (id) {
      const client = await pool.connect()
      const result = await client.query('DELETE FROM ' + collection + ' WHERE id=$1', [id])
      if (result.rowCount === 0) {
        throw new util.ApiError(404, 'document not found')
      }
      return 'OK'
    }
  }
}
