const request = require('supertest')
const chai = require('chai')
const expect = chai.expect
const testutils = require('./testutils')
const { app, api } = testutils

describe('request logging', function () {
  it('logs 404', async function () {
    const actualRes = await request(app)
      .post('/users/login2')
      .send()
      .expect(404)
    const requestId = actualRes.headers['x-request-id']
    const logs = await api.db.requestlog.find({ url: '/users/login2' })
    const log = logs[0]
    expect(log.res.statusCode).to.equal(404)
    expect(log.res.requestId).to.equal(requestId)
  })

  it('respects logging severity level', async function () {
    api.settings.logging_level = 'error'
    await request(app)
      .post('/users/login3')
      .send()
      .expect(404)
    const logs = await api.db.requestlog.find({ url: '/users/login3' })
    expect(logs).have.lengthOf(0)
  })
})
