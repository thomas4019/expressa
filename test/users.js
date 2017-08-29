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

var validUser = {
  email: 'test@example.com',
  password: 'test123'
}
describe('user functionality', function () {
  it('can login', function (done) {
    request(app)
      .post('/user/login')
      .send(JSON.stringify(validUser))
      .expect(200)
      .end(function (err, res) {
        if (err) {
          return done(err)
        }
        expect(res.body.uid).to.equal('42Fxx1Qz')
        done()
      })
  })

  var wrongUser = {
    email: 'test2@example.com',
    password: 'test'
  }
  it('rejects unknown email', function (done) {
    request(app)
      .post('/user/login')
      .send(JSON.stringify(wrongUser))
      .expect({
        error: 'No user found with this email.'
      })
      .expect(400, done)
  })

  var badPasswordUser = {
    email: 'test@example.com',
    password: 'test2'
  }
  it('rejects invalid password', function (done) {
    request(app)
      .post('/user/login')
      .send(JSON.stringify(badPasswordUser))
      .expect({
        error: 'Incorrect password'
      })
      .expect(401, done)
  })
})
