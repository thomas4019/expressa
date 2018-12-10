/* global it describe */
var request = require('supertest')
var chai = require('chai')
var expect = chai.expect
var expressa = require('../')
var api = expressa.api({
  'file_storage_path': 'testdata'
})
var express = require('express')
var app = express()
app.use(api)

describe('request logging', function () {
  it('logs 404', async function () {
    await request(app)
      .post('/user/login2')
      .send()
      .expect(404)
    const logs = await api.db.log.find({ url: '/user/login2' })
    const log = logs[0]
    expect(log.res.statusCode).to.equal(404)
  })

  it('respects logging severity level', async function () {
    api.settings.logging_level = 'error'
    await request(app)
      .post('/user/login3')
      .send()
      .expect(404)
    const logs = await api.db.log.find({ url: '/user/login3' })
    expect(logs).have.lengthOf(0)
  })
})
