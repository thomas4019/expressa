const expressa = require('../')
const util = require('../util.js')
const request = require('supertest')
const chai = require('chai')
const expect = chai.expect

const api = expressa.api({
  'file_storage_path': 'testdata'
})

const express = require('express')
const app = express()
app.use(api)

it('returns ready', function (done) {
  api.addListener('ready', function () {
    done()
  })
})

it('returns status', async function () {
  const res = await request(app)
    .get('/status')
    .expect(200)
  expect(res.body.installed).to.equal(true)

  const token = await util.getUserWithPermissions(api, ['settings: edit'])
  await request(app)
    .post('/settings/development/update')
    .set('x-access-token', token)
    .send({ $set: { installed: false } })
    .expect(200)

  const res3 = await request(app)
    .get('/status')
    .expect(200)
  expect(res3.body.installed).to.equal(false)

  await request(app)
    .post('/settings/development/update')
    .set('x-access-token', token)
    .send({ $set: { installed: true } })
    .expect(200)
})

it('returns collections', async function () {
  await request(app)
    .get('/collection')
    .expect(200)
})
