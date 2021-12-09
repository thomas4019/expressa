const request = require('supertest')
const chai = require('chai')
const expect = chai.expect
const testutils = require('./testutils')
const { app, api } = testutils

describe('basic collections', function () {
  it('insert collection', async function() {
    const testdocColl = {
      _id: 'testdoc',
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          _id: {
            type: 'string'
          },
          arr: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          title: {
            type: 'string'
          },
          data: {
            type: 'object',
            additionalProperties: true,
            properties: {}
          },
          meta: {
            type: 'object',
            propertyOrder: 2000,
            properties: {
              created: {
                type: 'string'
              },
              updated: {
                type: 'string'
              }
            }
          }
        },
        required: [
          'title'
        ]
      },
      admin: { columns: ['_id', 'title'] },
      storage: 'memory',
      documentsHaveOwners: true,
    }

    const token = await testutils.getUserWithPermissions(api, 'collection: create')
    const res = await request(app)
      .post('/collection')
      .set('x-access-token', token)
      .send(testdocColl)
      .expect(200)
    expect(res.body.status).to.equal('OK')
  })

  it('create without id', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: create')
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
    const token = await testutils.getUserWithPermissions(api, 'testdoc: create')
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

    const owner = (await api.db.testdoc.get('test123')).meta.owner
    expect(owner).to.not.be.undefined
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
    const token = await testutils.getUserWithPermissions(api, 'testdoc: create')
    await request(app)
      .post('/testdoc')
      .set('x-access-token', token)
      .send({
        title: 'doc1',
        bad: 'test'
      })
      .expect(400)
  })

  it('fail to create with missing required field', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: create')
    await request(app)
      .post('/testdoc')
      .set('x-access-token', token)
      .send({})
      .expect(400)
  })

  it('fail to read a schema without permission', async function () {
    const token = await testutils.getUserWithPermissions(api, 'blah')
    await request(app)
      .get('/testdoc/schema')
      .set('x-access-token', token)
      .expect(401)
  })

  it('read a schema', async function () {
    const token = await testutils.getUserWithPermissions(api, 'schemas: view')
    const res = await request(app)
      .get('/testdoc/schema')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body.type).to.equal('object')
    expect(res.body).to.have.property('properties')
    expect(res.body.properties.meta.properties).to.have.property('created')

    const token2 = await testutils.getUserWithPermissions(api, ['testdoc: view', 'collection: view relevant'])
    await request(app)
      .get('/collection/testdoc')
      .set('x-access-token', token2)
      .expect(200)
  })

  it('fail to read a specific doc without permission', async function () {
    const token = await testutils.getUserWithPermissions(api)
    await request(app)
      .get('/testdoc/test123')
      .set('x-access-token', token)
      .expect(401)
  })

  it('fail to read paged without permission', async function () {
    const token = await testutils.getUserWithPermissions(api)
    await request(app)
      .get('/testdoc/?page=1')
      .set('x-access-token', token)
      .expect(401)
  })

  it('read a specific doc', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: view')
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

  it('caching is configurable for each collection', async function () {
    const token = await testutils.getUserWithPermissions(api, ['testdoc: view', 'collection: edit'])
    const res = await request(app)
      .get('/testdoc/test123')
      .set('x-access-token', token)
      .expect(200)
    expect(res.headers['cache-control']).to.equal('no-cache, no-store, must-revalidate')

    await request(app)
      .post('/collection/testdoc/update')
      .set('x-access-token', token)
      .send({ $set: { allowHTTPCaching: true }})
      .expect(200)

    const res2 = await request(app)
      .get('/testdoc/test123')
      .set('x-access-token', token)
      .expect(200)
    expect(res2.headers).to.not.have.property('cache-control')

    await request(app)
      .post('/collection/testdoc/update')
      .set('x-access-token', token)
      .send({ $unset: { allowHTTPCaching: 1 }})
      .expect(200)
  })

  it('edit a document adding new field', async function () {
    const updatedDoc = {
      title: 'doc1-updated',
      new_field: 'cool'
    }
    const token = await testutils.getUserWithPermissions(api, ['testdoc: edit', 'collection: view', 'collection: edit', 'collection: delete', 'collection: create'])
    await request(app)
      .put('/testdoc/test123')
      .set('x-access-token', token)
      .send(updatedDoc)
      .expect(400)

    const { body } = await request(app)
      .get('/collection/testdoc')
      .set('x-access-token', token)
      .expect(200)
    body.schema.properties.new_field = { type: 'string' }

    // Add new_field to schema
    await request(app)
      .put('/collection/testdoc')
      .set('x-access-token', token)
      .send(testutils.clone(body))
      .expect(200)

    // The new doc should now be considered valid
    await request(app)
      .put('/testdoc/test123')
      .set('x-access-token', token)
      .send(updatedDoc)
      .expect(200)

    delete body.schema.properties.new_field

    // Delete the collection
    await request(app)
      .delete('/collection/testdoc')
      .set('x-access-token', token)

    // Should get 404 when inserting
    await request(app)
      .put('/testdoc/test123')
      .set('x-access-token', token)
      .send(updatedDoc)
      .expect(404)

    // Restore old schema
    await request(app)
      .post('/collection')
      .set('x-access-token', token)
      .send(testutils.clone(body))
      .expect(200)
  })

  it('edit a document', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: edit')
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

    const owner = (await api.db.testdoc.get('test123')).meta.owner
    expect(owner).to.not.be.undefined
  })

  it('update document by id', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: edit')
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

    const owner = (await api.db.testdoc.get('test123')).meta.owner
    expect(owner).to.not.be.undefined
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
    const token = await testutils.getUserWithPermissions(api, 'testdoc: delete')
    await request(app)
      .delete('/testdoc/test123')
      .set('x-access-token', token)
      .expect(200)
      .expect({
        status: 'OK'
      })
  })

  it('delete a document with own permission', async function () {
    const token = await testutils.getUserWithPermissions(api, ['testdoc: edit', 'testdoc: delete own'])

    const updatedDoc = {
      title: 'doc1-updated',
    }
    await request(app)
      .put('/testdoc/test123')
      .set('x-access-token', token)
      .send(updatedDoc)
      .expect(200)

    await request(app)
      .delete('/testdoc/test123')
      .set('x-access-token', token)
      .expect(200)
      .expect({
        status: 'OK'
      })
  })

  it('fail to delete a non-existent document', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: delete')
    await request(app)
      .delete('/testdoc/test123')
      .set('x-access-token', token)
      .expect(404)
      .expect({
        error: 'document not found'
      })
  })

  it('creating new collection updates Admin role', async function () {
    const token = await testutils.getUserWithPermissions(api, ['collection: create', 'collection: delete'])
    await request(app)
      .post('/collection')
      .set('x-access-token', token)
      .send({
        _id: 'newcoll',
        storage: 'memory',
        documentsHaveOwners: false,
        schema: {}
      })
      .expect(200)

    let admin = await api.db.role.get('Admin')
    expect(admin.permissions).to.have.property('newcoll: create')
    expect(admin.permissions).to.not.have.property('newcoll: edit own')

    await request(app)
      .delete('/collection/newcoll')
      .set('x-access-token', token)
      .expect(200)

    admin = await api.db.role.get('Admin')
    expect(admin.permissions).to.not.have.property('newcoll: create')
  })

  it('creating new collection updates Admin role (with owners)', async function () {
    const token = await testutils.getUserWithPermissions(api, ['collection: create', 'collection: delete'])
    await request(app)
      .post('/collection')
      .set('x-access-token', token)
      .send({
        _id: 'newcoll',
        storage: 'memory',
        documentsHaveOwners: true,
        schema: {}
      })
      .expect(200)

    let admin = await api.db.role.get('Admin')
    expect(admin.permissions).to.have.property('newcoll: create')
    expect(admin.permissions).to.have.property('newcoll: edit own')

    await request(app)
      .delete('/collection/newcoll')
      .set('x-access-token', token)
      .expect(200)

    admin = await api.db.role.get('Admin')
    expect(admin.permissions).to.not.have.property('newcoll: create')
    expect(admin.permissions).to.not.have.property('newcoll: edit own')
  })
})
