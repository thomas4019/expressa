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
var util = require('../util.js')

const validUser = {
  email: 'test@example.com',
  password: 'test123'
}
const badPasswordUser = {
  email: 'test@example.com',
  password: 'test2'
}
const invalidEmailUser = {
  email: 'test2@example.com',
  password: 'test'
}
describe('user functionality', function () {
  it('can login', async function () {
    const res = await request(app)
      .post('/user/login')
      .send(validUser)
      .expect(200)
    expect(res.body.uid).to.equal('42Fxx1Qz')
  })

  it('rejects unknown email', async function () {
    await request(app)
      .post('/user/login')
      .send(invalidEmailUser)
      .expect({
        error: 'No user found with this email.'
      })
      .expect(400)
  })

  it('rejects invalid password', async function () {
    await request(app)
      .post('/user/login')
      .send(badPasswordUser)
      .expect({
        error: 'Incorrect password'
      })
      .expect(401)
  })

  it('get my user', async function () {
    const token = await util.getUserWithPermissions(api, 'users: view own')
    const res = await request(app)
      .get('/user/me')
      .set('x-access-token', token)
    expect(res.body.permissions).to.eql({ 'users: view own': true })
  })
})
