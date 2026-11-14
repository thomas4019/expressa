const request = require('supertest')
const chai = require('chai')
const expect = chai.expect
const testutils = require('./testutils')
const util = require('../util')
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

describe('request logging crash safety', function () {
  const res = { statusCode: 404, getHeader: () => undefined, getHeaders: () => ({}) }

  it('createLogEntry does not throw on a malformed percent-escape', function () {
    const url = '/api/does-not-exist%E0%A4%A'
    const req = { originalUrl: url, url, headers: {}, method: 'GET' }
    // decodeURI would throw URIError here; the entry must fall back to raw.
    const entry = util.createLogEntry(req, res)
    expect(entry.url).to.equal(url)
  })

  it('createLogEntry strips null bytes from url and headers', function () {
    const req = {
      originalUrl: '/api/x\u0000y',
      url: '/api/x\u0000y',
      headers: { 'user-agent': 'scan\u0000er', referer: 'ref\u0000' },
      method: 'GET',
    }
    const entry = util.createLogEntry(req, res)
    expect(entry.url).to.equal('/api/xy')
    expect(entry.referer).to.equal('ref')
    expect(entry.req.headers['user-agent']).to.equal('scaner')
    expect(JSON.stringify(entry)).to.not.contain('\u0000')
  })

  it('a failed log write does not crash the process', async function () {
    const previousLevel = api.settings.logging_level
    api.settings.logging_level = 'warning' // ensure the 404 is logged
    const originalCreate = api.db.requestlog.create
    let writeAttempted = false
    api.db.requestlog.create = async function () {
      writeAttempted = true
      throw new Error('simulated log store failure')
    }
    const unhandled = []
    const onUnhandled = (err) => unhandled.push(err)
    process.on('unhandledRejection', onUnhandled)
    try {
      await request(app)
        .post('/users/login-crashtest')
        .send()
        .expect(404)
      await testutils.sleep(50) // let the detached onFinished callback run
    } finally {
      process.removeListener('unhandledRejection', onUnhandled)
      api.db.requestlog.create = originalCreate
      api.settings.logging_level = previousLevel
    }
    expect(writeAttempted).to.equal(true)
    expect(unhandled).to.have.lengthOf(0)
  })
})
