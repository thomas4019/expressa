const request = require('supertest')
const chai = require('chai')
const expect = chai.expect

const testutils = require('./testutils')
const { app, api } = testutils

describe('General Tests:', () => {
  it('returns ready', function (done) {
    api.addListener('ready', function onStart() {
      done()
    })
  })

  xit('returns status', async function () {
    const res = await request(app)
      .get('/status')
      .expect(200)
    expect(res.body.installed).to.equal(true)

    const token = await testutils.getUserWithPermissions(api, ['settings: edit'])
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

  it('Prevents caching by default', async function () {
    const res = await request(app)
      .get('/status')
      .expect(200)
    expect(res.headers['cache-control']).to.equal('no-cache, no-store, must-revalidate')
    expect(res.headers.expires).to.equal('-1')
  })

  it('returns collections', async function () {
    const token = await testutils.getUserWithPermissions(api, ['collection: view'])
    await request(app)
      .get('/collection')
      .set('x-access-token', token)
      .expect(200)
  })

  it('returns collections using a key', async function () {
    const badKey = '123'
    await request(app)
      .get('/collection')
      .set('x-access-key', badKey)
      .expect(401)

    const key = await testutils.getAccessKeyForUserWithPermissions(api, ['collection: view'])
    await request(app)
      .get('/collection')
      .set('x-access-key', key)
      .expect(200)
  })

  it('Sets headers', async function () {
    const token = await testutils.getUserWithPermissions(api, ['collection: view'])
    const res = await request(app)
      .get('/collection')
      .set('x-access-token', token)
      .expect(200)
    expect(res.headers).to.have.property('x-request-id')
    expect(res.headers['x-request-id']).to.have.length(12)
  })

  it('allows custom endpoints', async function () {
    // Add a custom endpoint which returns the current user
    api.custom.get('/test', function (req, res) {
      res.send(req.user)
    })

    const token = await testutils.getUserWithPermissions(api, [])
    const res = await request(app)
      .get('/test')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body).to.have.property('email')
  })
})
