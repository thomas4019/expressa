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
  it('create without id', async function () {
    const token = await util.getUserWithPermissions(api, 'testdoc: create')
    const res = await request(app)
      .post('/testdoc')
      .set('x-access-token', token)
      .send({
        title: 'doc1'
      })
      .expect(200)
    expect(res.body.status).to.equal('OK')
  })

  it('create with a specific id', async function () {
    const token = await util.getUserWithPermissions(api, 'testdoc: create')
    await request(app)
      .post('/testdoc')
      .set('x-access-token', token)
      .send({
        _id: 'test123',
        title: 'doc1'
      })
      .expect(200)
      .expect({
        id: 'test123',
        status: 'OK'
      })
  })

  it('fail to create without permission', async function () {
    await request(app)
      .post('/testdoc')
      .send({
        title: 'doc1'
      })
      .expect({
        error: 'You do not have permission to perform this action.'
      })
      .expect(401)
  })

  it('fail to create with invalid field', async function () {
    const token = await util.getUserWithPermissions(api, 'testdoc: create')
    await request(app)
      .post('/testdoc')
      .set('x-access-token', token)
      .send({
        title: 'doc1',
        bad: 'test'
      })
      .expect(500)
  })

  it('fail to create with missing required field', async function () {
    const token = await util.getUserWithPermissions(api, 'testdoc: create')
    await request(app)
      .post('/testdoc')
      .set('x-access-token', token)
      .send({})
      .expect(500)
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

  it('read a sperific doc', async function () {
    const token = await util.getUserWithPermissions(api, 'testdoc: view')
    const res = await request(app)
      .get('/testdoc/test123')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body._id).to.equal('test123')
    expect(res.body.title).to.equal('doc1')
  })

  it('fail to read without permission', async function () {
    await request(app)
      .get('/testdoc/test123')
      .expect({
        error: 'You do not have permission to perform this action.'
      })
      .expect(401)
  })

  it('edit a document', async function () {
    const token = await util.getUserWithPermissions(api, 'testdoc: edit')
    await request(app)
      .put('/testdoc/test123')
      .set('x-access-token', token)
      .send({
        title: 'doc1-updated',
        data: {
          field: 'value'
        }
      })
      .expect(200)
      .expect({
        id: 'test123',
        status: 'OK'
      })
  })

  it('update document by id', async function () {
    const token = await util.getUserWithPermissions(api, 'testdoc: edit')
    const res = await request(app)
      .post('/testdoc/test123/update')
      .set('x-access-token', token)
      .send({
        $set: {
          title: 'cool'
        },
        $unset: {
          data: 1
        }
      })
      .expect(200)
    expect(res.body.title).to.equal('cool')
    expect(res.body.data).to.equal(undefined)
  })

  it('fail to edit a document without permission', async function () {
    await request(app)
      .put('/testdoc/test123')
      .send({
        title: 'doc1-updated',
        data: {
          field: 'value'
        }
      })
      .expect(401)
  })

  it('fail to delete a document without permission', async function () {
    await request(app)
      .delete('/testdoc/test123')
      .expect(401)
  })

  it('delete a document', async function () {
    const token = await util.getUserWithPermissions(api, 'testdoc: delete')
    await request(app)
      .delete('/testdoc/test123')
      .set('x-access-token', token)
      .expect(200)
      .expect({
        status: 'OK'
      })
  })

  it('fail to delete a non-existent document', async function () {
    const token = await util.getUserWithPermissions(api, 'testdoc: delete')
    await request(app)
      .delete('/testdoc/test123')
      .set('x-access-token', token)
      .expect(404)
      .expect({
        error: 'document not found'
      })
  })
})
