const chai = require('chai')
const expect = chai.expect
const request = require('supertest')
const testutils = require('./testutils')
const { app, api } = testutils

// Regression tests for path traversal in the per-document REST routes. A
// document id such as "../settings/<env>" used to reach the file store, where
// it became path.join(collectionDir, id + '.json') and escaped the collection
// directory. Express decodes %2f to "/" within one path segment, so
// GET /sectest/..%2fsettings%2f<env> arrives as id "../settings/<env>".
// These assert the safe behaviour: the traversal must be rejected.
describe('security: document id path traversal', function () {
  const collection = 'sectest'
  // id that escapes the collection dir and targets testdata/settings/<env>.json
  const traversalId = '..%2fsettings%2f' + process.env.NODE_ENV
  let lowPrivToken

  before(async function () {
    const coll = {
      _id: collection,
      storage: 'file',
      documentsHaveOwners: false,
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
        },
      },
    }
    const adminToken = await testutils.getUserWithPermissions(api, 'collection: create')
    await request(app)
      .post('/collection')
      .set('x-access-token', adminToken)
      .send(coll)
      .expect(200)

    await request(app)
      .post('/' + collection)
      .set('x-access-token', await testutils.getUserWithPermissions(api, collection + ': create'))
      .send({ title: 'hello' })
      .expect(200)

    // A low-privilege user holding only "<collection>: view" / edit / delete.
    lowPrivToken = await testutils.getUserWithPermissions(api, [
      collection + ': view',
      collection + ': edit',
      collection + ': delete',
    ])
  })

  it('does not disclose the settings file via GET traversal', async function () {
    const res = await request(app)
      .get('/' + collection + '/' + traversalId)
      .set('x-access-token', lowPrivToken)
    // Must not return 200 with the settings document.
    expect(res.status).to.not.equal(200)
    expect(res.body).to.not.have.property('jwt_secret')
  })

  it('does not disclose the settings file via POST .../update traversal', async function () {
    const res = await request(app)
      .post('/' + collection + '/' + traversalId + '/update')
      .set('x-access-token', lowPrivToken)
      .send({ $set: { pwned: true } })
    expect(res.status).to.not.equal(200)
    // Ensure the settings file was not modified.
    const settings = await api.db.settings.get(process.env.NODE_ENV)
    expect(settings).to.not.have.property('pwned')
  })

  it('does not delete arbitrary files via DELETE traversal', async function () {
    // Target a throwaway file so a regression here cannot wipe real fixtures.
    await api.db.settings.create({ _id: 'sectest-victim', keep: true })
    const res = await request(app)
      .delete('/' + collection + '/..%2fsettings%2fsectest-victim')
      .set('x-access-token', lowPrivToken)
    expect(res.status).to.not.equal(200)
    const victim = await api.db.settings.get('sectest-victim')
    expect(victim).to.have.property('keep', true)
  })
})
