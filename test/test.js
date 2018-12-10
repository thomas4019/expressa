var expressa = require('../')
var request = require('supertest')

var api = expressa.api({
  'file_storage_path': 'testdata'
})

var express = require('express')
var app = express()
app.use('/api', api)

it('returns ready', function (done) {
  api.addListener('ready', function () {
    console.log('ready')
    done()
  })
})

it('returns status', function (done) {
  request(app)
    .get('/api/status')
    .expect(200)
    .end(function (err, res) {
      if (err) {
        return done(err)
      }
      done()
    })
})

it('returns collections', function (done) {
  console.error(Object.keys(api.db))
  request(app)
    .get('/api/collection')
    .expect(200, done)
})
