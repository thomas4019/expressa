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

describe('querying collections', function () {
  it('create doc 1', function (done) {
    util.getUserWithPermissions(api, 'testdoc: create')
      .then(function (token) {
        request(app)
          .post('/testdoc')
          .set('x-access-token', token)
          .send(JSON.stringify({
            title: 'doc1',
            data: {
              number: 0
            }
          }))
          .expect(200, done)
      })
  })

  it('create doc 2', function (done) {
    util.getUserWithPermissions(api, 'testdoc: create')
      .then(function (token) {
        request(app)
          .post('/testdoc')
          .set('x-access-token', token)
          .send(JSON.stringify({
            title: 'doc2',
            data: {
              number: -3
            }
          }))
          .expect(200, done)
      })
  })

  it('create doc 3', function (done) {
    util.getUserWithPermissions(api, 'testdoc: create')
      .then(function (token) {
        request(app)
          .post('/testdoc')
          .set('x-access-token', token)
          .send(JSON.stringify({
            title: 'doc3',
            data: {
              number: 2,
              field: 'test'
            }
          }))
          .expect(200, done)
      })
  })

  it('read entire collection', function (done) {
    util.getUserWithPermissions(api, 'testdoc: view')
      .then(function (token) {
        request(app)
          .get('/testdoc')
          .set('x-access-token', token)
          .expect(200, function(err, res) {
            if (err) {
              return done(err)
            }
            //expect(res.body._id).to.equal('test123')
            expect(res.body).to.have.lengthOf(3);
            done()
          })
      })
  })

  it('return docs matching deep field', function (done) {
    util.getUserWithPermissions(api, 'testdoc: view')
      .then(function (token) {
        request(app)
          .get('/testdoc?query={"data.field":"test"}')
          .set('x-access-token', token)
          .expect(200, function(err, res) {
            if (err) {
              return done(err)
            }
            expect(res.body[0].title).to.equal('doc3')
            expect(res.body).to.have.lengthOf(1);
            done()
          })
      })
  })

  it('returns no documents without permission', function (done) {
    request(app)
      .get('/testdoc')
      .expect(200, function(err, res) {
        if (err) {
          return done(err)
        }
        expect(res.body).to.have.lengthOf(0);
        done()
      })
  })

  it('returns page 1 correctly', function (done) {
    request(app)
      .get('/testdoc?query={}&limit=2&page=0')
      .expect(200, function(err, res) {
        if (err) {
          return done(err)
        }
        console.log(res.body)
        expect(res.body.itemsTotal).to.equal(3)
        expect(res.body.itemsPerPage).to.equal(2)
        expect(res.body.pages).to.equal(2)
        expect(res.body.pagePrev).to.equal(undefined)
        expect(res.body.pageNext).to.equal(1)
        expect(res.body.data).to.have.lengthOf(2);

        expect(res.body.data[0].title).to.equal('doc1')
        expect(res.body.data[1].title).to.equal('doc2')
        done()
      })
  })

  it('returns page 2 correctly', function (done) {
    request(app)
      .get('/testdoc?query={}&limit=2&page=1')
      .expect(200, function(err, res) {
        if (err) {
          return done(err)
        }
        console.log(res.body)
        expect(res.body.itemsTotal).to.equal(3)
        expect(res.body.itemsPerPage).to.equal(2)
        expect(res.body.pages).to.equal(2)
        expect(res.body.pagePrev).to.equal(0)
        expect(res.body.pageNext).to.equal(undefined)
        expect(res.body.data).to.have.lengthOf(1);

        expect(res.body.data[0].title).to.equal('doc3')
        done()
      })
  })

  it('sort by deep field ascending', function (done) {
    util.getUserWithPermissions(api, 'testdoc: view')
      .then(function (token) {
        request(app)
          .get('/testdoc?orderby={"data.number":1}')
          .set('x-access-token', token)
          .expect(200, function(err, res) {
            if (err) {
              return done(err)
            }
            //expect(res.body._id).to.equal('test123')
            expect(res.body).to.have.lengthOf(3);
            expect(res.body[0].title).to.equal('doc2');
            expect(res.body[1].title).to.equal('doc1');
            expect(res.body[2].title).to.equal('doc3');
            done()
          })
      })
  })

  it('sort by deep field descending', function (done) {
    util.getUserWithPermissions(api, 'testdoc: view')
      .then(function (token) {
        request(app)
          .get('/testdoc?orderby={"meta.created":-1}')
          .set('x-access-token', token)
          .expect(200, function(err, res) {
            if (err) {
              return done(err)
            }
            //expect(res.body._id).to.equal('test123')
            expect(res.body).to.have.lengthOf(3);
            expect(res.body[0].title).to.equal('doc3');
            expect(res.body[1].title).to.equal('doc2');
            expect(res.body[2].title).to.equal('doc1');
            done()
          })
      })
  })

})