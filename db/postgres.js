const util = require('../util')

module.exports = function (settings, collectionId, collection) {
  const pool = util.getPgPool(settings.postgresql_uri)

  return {
    init: async function () {
      if (collection.plainStringIds) {
        await pool.query('CREATE TABLE IF NOT EXISTS ' + collectionId + ' (id text primary key, data jsonb)')
      } else {
        await pool.query('CREATE TABLE IF NOT EXISTS ' + collectionId + ' (id uuid primary key, data jsonb)')
      }
    },
    all: async function () {
      return this.find({})
    },
    find: async function (rawQuery, offset, limit, orderby, fields) {
      const pgSelect = util.mongoToPostgresSelect(collectionId, fields)
      const pgWhere = util.mongoToPostgresWhere(collectionId, rawQuery)
      let query = 'SELECT ' + pgSelect + ' FROM ' + collectionId + (pgWhere ? ' WHERE ' + pgWhere : '')
      if (typeof orderby !== 'undefined') {
        query += ' ORDER BY '
        query += util.mongoToPostgresOrderBy(collectionId, orderby)
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
    count: async function(rawQuery, offset, limit) {
      const pgWhere = util.mongoToPostgresWhere(collectionId, rawQuery)
      let query = 'SELECT COUNT(*) FROM ' + collectionId + (pgWhere ? ' WHERE ' + pgWhere : '')
      if (typeof offset !== 'undefined') {
        query += ' OFFSET ' + offset
      }
      if (typeof limit !== 'undefined') {
        query += ' LIMIT ' + limit
      }
      const result = await pool.query(query)
      return parseInt(result.rows[0].count)
    },
    get: async function (id, fields) {
      const pgSelect = util.mongoToPostgresSelect(collectionId, fields)
      const result = await pool.query(`SELECT ${pgSelect} FROM ${collectionId} WHERE id = $1`, [id])
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
    // eslint-disable-next-line no-unused-vars
    updateWithQuery: async function (query, update, options) {
      const pgWhere = util.mongoToPostgresWhere(collectionId, query)
      const updateSql = util.mongoToPostgresUpdate(collectionId, update)
      const result = await pool.query('UPDATE ' + collectionId + ' SET data=' + updateSql + ' WHERE ' + pgWhere)
      return {
        matchedCount: result.rowCount
      }
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
