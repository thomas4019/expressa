var request = require('supertest')
var chai = require('chai')
var expect = chai.expect
var expressa = require('../')
var util = require('../util.js')
var api = expressa.api({
  'file_storage_path': 'testdata'
})
var express = require('express')
var app = express()
app.use(api)

describe('basic collections', function () {
  it('create without id', function (done) {
    util.getUserWithPermissions(api, 'testdoc: create')
      .then(function (token) {
        request(app)
          .post('/testdoc')
          .set('x-access-token', token)
          .send(JSON.stringify({
            title: 'doc1'
          }))
          .expect(200, function (err, res) {
            if (err) {
              return done(err)
            }
            expect(res.body.status).to.equal('OK')
            done()
          })
      })
  })

  it('create with a specific id', function (done) {
    util.getUserWithPermissions(api, 'testdoc: create')
      .then(function (token) {
        request(app)
          .post('/testdoc')
          .set('x-access-token', token)
          .send(JSON.stringify({
            _id: 'test123',
            title: 'doc1'
          }))
          .expect(200)
          .expect({
            id: 'test123',
            status: 'OK'
          }, done)
      })
  })

  it('fail to create without permission', function (done) {
    request(app)
      .post('/testdoc')
      .send(JSON.stringify({
        title: 'doc1'
      }))
      .expect({
        error: 'You do not have permission to perform this action.'
      })
      .expect(401, done)
  })

  it('fail to create with invalid field', function (done) {
    util.getUserWithPermissions(api, 'testdoc: create')
      .then(function (token) {
        request(app)
          .post('/testdoc')
          .set('x-access-token', token)
          .send(JSON.stringify({
            title: 'doc1',
            bad: 'test'
          }))
          .expect(500, done)
      })
  })

  it('fail to create with missing required field', function (done) {
    util.getUserWithPermissions(api, 'testdoc: create')
      .then(function (token) {
        request(app)
          .post('/testdoc')
          .set('x-access-token', token)
          .send(JSON.stringify({
          }))
          .expect(500, done)
      })
  })

  it('fail to read a schema without permission', async function () {
    const token = await util.getUserWithPermissions(api, 'blah')
    await request(app)
      .get('/testdoc/schema')
      .set('x-access-token', token)
      .expect(401)
  })

  it('read a schema', async function () {
    const token = await util.getUserWithPermissions(api, 'schemas: view')
    const res = await request(app)
      .get('/testdoc/schema')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body.type).to.equal('object')
    expect(res.body).to.have.property('properties')
  })

  it('read a sperific doc', function (done) {
    util.getUserWithPermissions(api, 'testdoc: view')
      .then(function (token) {
        request(app)
          .get('/testdoc/test123')
          .set('x-access-token', token)
          .expect(200, function (err, res) {
            if (err) {
              return done(err)
            }
            expect(res.body._id).to.equal('test123')
            expect(res.body.title).to.equal('doc1')
            done()
          })
      })
  })

  it('fail to read without permission', function (done) {
    request(app)
      .get('/testdoc/test123')
      .expect({
        error: 'You do not have permission to perform this action.'
      })
      .expect(401, done)
  })

  it('edit a document', function (done) {
    util.getUserWithPermissions(api, 'testdoc: edit')
      .then(function (token) {
        request(app)
          .put('/testdoc/test123')
          .set('x-access-token', token)
          .send(JSON.stringify({
            title: 'doc1-updated',
            data: {
              field: 'value'
            }
          }))
          .expect(200)
          .expect({
            id: 'test123',
            status: 'OK'
          }, done)
      })
  })

  it('update document by id', async function () {
    const token = await util.getUserWithPermissions(api, 'testdoc: edit')
    const res = await request(app)
      .post('/testdoc/test123/update')
      .set('x-access-token', token)
      .send(JSON.stringify({
        $set: {
          title: 'cool'
        },
        $unset: {
          data: 1
        }
      }))
      .expect(200)
    expect(res.body.title).to.equal('cool')
    expect(res.body.data).to.be.undefined
  })

  it('fail to edit a document without permission', function (done) {
    request(app)
      .put('/testdoc/test123')
      .send(JSON.stringify({
        title: 'doc1-updated',
        data: {
          field: 'value'
        }
      }))
      .expect(401, done)
  })

  it('fail to delete a document without permission', function (done) {
    request(app)
      .delete('/testdoc/test123')
      .expect(401, done)
  })

  it('delete a document', function (done) {
    util.getUserWithPermissions(api, 'testdoc: delete')
      .then(function (token) {
        request(app)
          .delete('/testdoc/test123')
          .set('x-access-token', token)
          .expect(200)
          .expect({
            status: 'OK'
          }, done)
      })
  })

  it('fail to delete a non-existent document', function (done) {
    util.getUserWithPermissions(api, 'testdoc: delete')
      .then(function (token) {
        request(app)
          .delete('/testdoc/test123')
          .set('x-access-token', token)
          .expect(500)
          .expect({
            error: 'document not found'
          }, done)
      })
  })
})
