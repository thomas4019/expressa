var pg = require('pg')
var uuid = require('node-uuid')
var mongoToPostgres = require('mongo-query-to-postgres-jsonb')

module.exports = function (settings, collection) {
  return {
    init: function () {
      return new Promise(function (resolve, reject) {
        pg.connect(settings.postgresql_uri, function (err, client, done) {
          if (err) {
            return reject(err, 500)
          }
          client.query('CREATE TABLE IF NOT EXISTS ' + collection + ' (id text primary key, data jsonb)', function (err, result) {
            done()
            if (err) {
              return reject(err, 500)
            }
            resolve()
          })
        })
      })
    },
    all: function (id) {
      return new Promise(function (resolve, reject) {
        pg.connect(settings.postgresql_uri, function (err, client, done) {
          if (err) {
            return reject(err, 500)
          }
          client.query('SELECT * FROM ' + collection, function (err, result) {
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
    find: function (query, offset, limit, orderby) {
      var pgQuery = mongoToPostgres('data', query||{})
      return new Promise(function (resolve, reject) {
        pg.connect(settings.postgresql_uri, function (err, client, done) {
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
    get: function (id) {
      return new Promise(function (resolve, reject) {
        pg.connect(settings.postgresql_uri, function (err, client, done) {
          if (err) {
            return reject(err, 500)
          }
          client.query('SELECT * FROM ' + collection + ' WHERE id = $1', [id], function (err, result) {
            done()
            if (err) {
              return reject(err, 500)
            }
            if (result.rowCount === 0) {
              return reject('document not found', 404)
            }
            resolve(result.rows[0].data)
          })
        })
      })
    },
    create: function (data) {
      return new Promise(function (resolve, reject) {
        pg.connect(settings.postgresql_uri, function (err, client, done) {
          if (err) {
            return reject(err, 500)
          }
          if (typeof data._id === 'undefined') {
            data._id = uuid.v4()
          }
          client.query('INSERT INTO ' + collection + ' (id, data) VALUES ($1, $2)', [data._id, data], function (err, result) {
            done()
            if (err) {
              reject(err)
            }
            resolve(data._id)
          })
        })
      })
    },
    update: function (id, data) {
      return new Promise(function (resolve, reject) {
        pg.connect(settings.postgresql_uri, function (err, client, done) {
          if (err) {
            return reject(err, 500)
          }
          if (typeof data._id === 'undefined') {
            data._id = id
          }
          client.query('UPDATE ' + collection + ' SET data=$2,id=$3 WHERE id=$1', [id, data, data._id], function (err, result) {
            done()
            if (err) {
              return reject(err, 500)
            }
            if (result.rowCount === 0) {
              return reject('document not found', 404)
            }
            resolve()
          })
        })
      })
    },
    delete: function (id) {
      return new Promise(function (resolve, reject) {
        pg.connect(settings.postgresql_uri, function (err, client, done) {
          if (err) {
            return reject(err, 500)
          }
          client.query('DELETE FROM ' + collection + ' WHERE id=$1', [id], function (err, result) {
            done()
            if (err) {
              return reject(err, 500)
            }
            if (result.rowCount === 0) {
              return reject('document not found', 404)
            }
            resolve('OK')
          })
        })
      })
    }
  }
}
